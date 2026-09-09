import { describe, expect, test } from "bun:test";
import { UnauthorizedError } from "../../../../shared/errors/app-error";
import type { AuthUser } from "../entities/AuthUser";
import type { IPasswordHasher, IAccessTokenSigner, IRefreshTokenIssuer } from "../ports/AuthPorts";
import type { IRefreshTokenRepository, RefreshTokenRecord } from "../repositories/IRefreshTokenRepository";
import type { IUserRepository } from "../repositories/IUserRepository";
import { LoginUseCase } from "./Login.usecase";
import { LogoutUseCase } from "./Logout.usecase";
import { RefreshSessionUseCase } from "./RefreshSession.usecase";

const user: AuthUser = {
  id: "u1",
  email: "admin@karyahr.local",
  passwordHash: "hashed",
  employeeId: "e1",
  isActive: true,
  roleNames: ["hr_admin"],
  permissionKeys: ["auth:me"],
};

class MemoryUsers implements IUserRepository {
  constructor(private readonly record: AuthUser | null) {}
  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.record && this.record.email === email ? this.record : null;
  }
  async findById(id: string): Promise<AuthUser | null> {
    return this.record && this.record.id === id ? this.record : null;
  }
  async findByEmployeeId(employeeId: string): Promise<AuthUser | null> {
    return this.record && this.record.employeeId === employeeId ? this.record : null;
  }
  async listByRoleName(): Promise<readonly AuthUser[]> {
    return this.record ? [this.record] : [];
  }
  async setActiveByEmployeeId(): Promise<void> {}
  async create(): Promise<AuthUser> {
    if (!this.record) {
      throw new Error("no user");
    }
    return this.record;
  }
}

class MemoryRefresh implements IRefreshTokenRepository {
  private rows: RefreshTokenRecord[] = [];
  async create(input: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly expiresAt: Date;
    readonly userAgent?: string;
  }): Promise<RefreshTokenRecord> {
    const row: RefreshTokenRecord = {
      id: `rt-${this.rows.length + 1}`,
      tokenHash: input.tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      revokedAt: null,
    };
    this.rows.push(row);
    return row;
  }
  async findActiveByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.rows.find((row) => row.tokenHash === tokenHash && row.revokedAt === null) ?? null;
  }
  async revoke(id: string, revokedAt: Date): Promise<void> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, revokedAt } : row));
  }
  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    this.rows = this.rows.map((row) =>
      row.userId === userId && row.revokedAt === null ? { ...row, revokedAt } : row,
    );
  }
}

const passwords: IPasswordHasher = {
  hash: async (password) => password,
  verify: async (password, hash) => password === "secret" && hash === "hashed",
};

const access: IAccessTokenSigner = {
  sign: async () => "access.jwt",
};

const refreshIssuer: IRefreshTokenIssuer = {
  issue: () => ({ raw: "raw-refresh", hash: "hash-refresh" }),
  hash: (raw) => `hash-${raw}`,
};

describe("LoginUseCase", () => {
  test("issues tokens for a valid password", async () => {
    const tokens = new MemoryRefresh();
    const result = await new LoginUseCase(
      new MemoryUsers(user),
      tokens,
      passwords,
      access,
      refreshIssuer,
    ).execute({
      email: "admin@karyahr.local",
      password: "secret",
      refreshTtlSeconds: 60,
    });
    expect(result.accessToken).toBe("access.jwt");
    expect(result.refreshToken).toBe("raw-refresh");
  });

  test("rejects invalid credentials", async () => {
    const useCase = new LoginUseCase(
      new MemoryUsers(user),
      new MemoryRefresh(),
      passwords,
      access,
      refreshIssuer,
    );
    try {
      await useCase.execute({
        email: "admin@karyahr.local",
        password: "wrong",
        refreshTtlSeconds: 60,
      });
      throw new Error("expected login to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
    }
  });
});

describe("RefreshSessionUseCase", () => {
  test("rotates a valid refresh token", async () => {
    const store = new MemoryRefresh();
    await store.create({
      tokenHash: "hash-raw-refresh",
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const issuer: IRefreshTokenIssuer = {
      issue: () => ({ raw: "next", hash: "hash-next" }),
      hash: (raw) => `hash-${raw}`,
    };
    const result = await new RefreshSessionUseCase(
      new MemoryUsers(user),
      store,
      access,
      issuer,
    ).execute({ refreshToken: "raw-refresh", refreshTtlSeconds: 60 });
    expect(result.refreshToken).toBe("next");
    const old = await store.findActiveByHash("hash-raw-refresh");
    expect(old).toBeNull();
  });
});

describe("LogoutUseCase", () => {
  test("revokes the current refresh token", async () => {
    const store = new MemoryRefresh();
    await store.create({
      tokenHash: "hash-raw-refresh",
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await new LogoutUseCase(store, refreshIssuer).execute("raw-refresh");
    expect(await store.findActiveByHash("hash-refresh")).toBeNull();
  });
});
