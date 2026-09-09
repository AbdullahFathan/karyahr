import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import type { AuthUser } from "../../../auth/domain/entities/AuthUser";
import type {
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from "../../../auth/domain/repositories/IRefreshTokenRepository";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { Employee } from "../entities/Employee";
import type { IEmployeeRepository, UpdateEmployeeInput } from "../repositories/IEmployeeRepository";
import { OffboardEmployeeUseCase } from "./OffboardEmployee.usecase";

function sampleEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "e1",
    fullName: "Siti",
    nationalId: "1",
    birthDate: new Date("1995-01-01"),
    address: "Jakarta",
    phone: "081",
    emergencyContact: "082",
    employeeNumber: "EMP-1",
    departmentId: "d1",
    positionId: "p1",
    managerId: null,
    joinedAt: new Date("2024-01-01"),
    status: "ACTIVE",
    contractType: "PERMANENT",
    ...overrides,
  };
}

const sampleUser: AuthUser = {
  id: "u-target",
  email: "siti@karyahr.local",
  passwordHash: "hashed",
  employeeId: "e1",
  isActive: true,
  roleNames: ["employee"],
  permissionKeys: ["auth:me"],
};

class MemoryEmployees implements IEmployeeRepository {
  constructor(private employee: Employee | null) {}
  async create(): Promise<Employee> {
    throw new Error("not used");
  }
  async update(_id: string, input: UpdateEmployeeInput): Promise<Employee> {
    if (!this.employee) {
      throw new Error("missing");
    }
    this.employee = { ...this.employee, ...input };
    return this.employee;
  }
  async findById(id: string): Promise<Employee | null> {
    return this.employee && this.employee.id === id ? this.employee : null;
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list() {
    return { items: this.employee ? [this.employee] : [], total: this.employee ? 1 : 0 };
  }
  async listDirectory() {
    return this.employee ? [this.employee] : [];
  }
}

class MemoryUsers implements IUserRepository {
  isActive = true;
  setActiveCalls: Array<{ employeeId: string; isActive: boolean }> = [];
  constructor(private readonly record: AuthUser | null) {}
  async findByEmail(): Promise<AuthUser | null> {
    return this.record;
  }
  async findById(): Promise<AuthUser | null> {
    return this.record;
  }
  async findByEmployeeId(employeeId: string): Promise<AuthUser | null> {
    return this.record && this.record.employeeId === employeeId ? this.record : null;
  }
  async listByRoleName(): Promise<readonly AuthUser[]> {
    return this.record ? [this.record] : [];
  }
  async setActiveByEmployeeId(employeeId: string, isActive: boolean): Promise<void> {
    this.setActiveCalls.push({ employeeId, isActive });
    this.isActive = isActive;
  }
  async create(): Promise<AuthUser> {
    if (!this.record) {
      throw new Error("no user");
    }
    return this.record;
  }
}

class MemoryRefresh implements IRefreshTokenRepository {
  rows: RefreshTokenRecord[] = [
    {
      id: "rt-1",
      tokenHash: "h1",
      userId: "u-target",
      expiresAt: new Date("2099-01-01"),
      revokedAt: null,
    },
    {
      id: "rt-2",
      tokenHash: "h2",
      userId: "u-other",
      expiresAt: new Date("2099-01-01"),
      revokedAt: null,
    },
  ];
  revokeAllCalls = 0;
  async create(): Promise<RefreshTokenRecord> {
    throw new Error("not used");
  }
  async findActiveByHash(): Promise<RefreshTokenRecord | null> {
    return null;
  }
  async revoke(): Promise<void> {}
  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    this.revokeAllCalls += 1;
    this.rows = this.rows.map((row) =>
      row.userId === userId && row.revokedAt === null ? { ...row, revokedAt } : row,
    );
  }
}

function createAudit() {
  const records: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
  const audit: IAuditLogRepository = {
    append: async (record) => {
      records.push({ action: record.action, metadata: record.metadata });
    },
  };
  return { audit, records };
}

describe("OffboardEmployeeUseCase", () => {
  test("deactivates the employee, revokes sessions, and stores a snapshot", async () => {
    const employees = new MemoryEmployees(sampleEmployee());
    const users = new MemoryUsers(sampleUser);
    const refreshTokens = new MemoryRefresh();
    const { audit, records } = createAudit();
    const result = await new OffboardEmployeeUseCase(employees, users, refreshTokens, audit).execute(
      {
        employeeId: "e1",
        actorUserId: "hr-user",
        actorEmployeeId: "hr-emp",
        reason: "Contract ended",
      },
    );
    expect(result.status).toBe("INACTIVE");
    expect(users.setActiveCalls).toEqual([{ employeeId: "e1", isActive: false }]);
    expect(refreshTokens.revokeAllCalls).toBe(1);
    expect(refreshTokens.rows.find((row) => row.id === "rt-1")?.revokedAt).not.toBeNull();
    expect(refreshTokens.rows.find((row) => row.id === "rt-2")?.revokedAt).toBeNull();
    expect(records[0]?.action).toBe("offboard");
    const snapshot = records[0]?.metadata?.snapshot as Record<string, unknown>;
    expect(snapshot.employeeNumber).toBe("EMP-1");
    expect(snapshot.status).toBe("ACTIVE");
    expect(records[0]?.metadata?.reason).toBe("Contract ended");
  });

  test("throws when the employee is missing", async () => {
    const employees = new MemoryEmployees(null);
    await expect(
      new OffboardEmployeeUseCase(
        employees,
        new MemoryUsers(null),
        new MemoryRefresh(),
        createAudit().audit,
      ).execute({
        employeeId: "missing",
        actorUserId: "hr-user",
        actorEmployeeId: "hr-emp",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("throws when the employee is already inactive", async () => {
    const employees = new MemoryEmployees(sampleEmployee({ status: "INACTIVE" }));
    await expect(
      new OffboardEmployeeUseCase(
        employees,
        new MemoryUsers(sampleUser),
        new MemoryRefresh(),
        createAudit().audit,
      ).execute({
        employeeId: "e1",
        actorUserId: "hr-user",
        actorEmployeeId: "hr-emp",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("throws when the actor offboards themselves", async () => {
    const employees = new MemoryEmployees(sampleEmployee());
    await expect(
      new OffboardEmployeeUseCase(
        employees,
        new MemoryUsers(sampleUser),
        new MemoryRefresh(),
        createAudit().audit,
      ).execute({
        employeeId: "e1",
        actorUserId: "u-target",
        actorEmployeeId: "e1",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("succeeds when the employee has no user account", async () => {
    const employees = new MemoryEmployees(sampleEmployee());
    const users = new MemoryUsers(null);
    const refreshTokens = new MemoryRefresh();
    const result = await new OffboardEmployeeUseCase(
      employees,
      users,
      refreshTokens,
      createAudit().audit,
    ).execute({
      employeeId: "e1",
      actorUserId: "hr-user",
      actorEmployeeId: "hr-emp",
    });
    expect(result.status).toBe("INACTIVE");
    expect(users.setActiveCalls).toEqual([{ employeeId: "e1", isActive: false }]);
    expect(refreshTokens.revokeAllCalls).toBe(0);
  });
});

describe("requirePermission", () => {
  test("denies callers without employees:write", () => {
    const mw = requirePermission("employees:write");
    let error: unknown;
    mw(
      { auth: { userId: "u1", employeeId: "e1", permissionKeys: ["auth:me"] } } as never,
      {} as never,
      (err?: unknown) => {
        error = err;
      },
    );
    expect(error).toBeInstanceOf(ForbiddenError);
  });
});
