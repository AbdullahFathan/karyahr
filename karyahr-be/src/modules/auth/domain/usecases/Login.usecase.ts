import { UnauthorizedError } from "../../../../shared/errors/app-error";
import type { AuthUser } from "../entities/AuthUser";
import type { IAccessTokenSigner, IPasswordHasher, IRefreshTokenIssuer } from "../ports/AuthPorts";
import type { IRefreshTokenRepository } from "../repositories/IRefreshTokenRepository";
import type { IUserRepository } from "../repositories/IUserRepository";

export type LoginInput = {
  readonly email: string;
  readonly password: string;
  readonly userAgent?: string;
  readonly refreshTtlSeconds: number;
};

export type SessionTokens = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: AuthUser;
};

/**
 * Authenticates a user and issues cookie session tokens.
 */
export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly passwords: IPasswordHasher,
    private readonly accessTokens: IAccessTokenSigner,
    private readonly refreshIssuer: IRefreshTokenIssuer,
  ) {}

  async execute(input: LoginInput): Promise<SessionTokens> {
    const user = await this.users.findByEmail(input.email.toLowerCase());
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid email or password");
    }
    const matches = await this.passwords.verify(input.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError("Invalid email or password");
    }
    const accessToken = await this.accessTokens.sign({
      userId: user.id,
      employeeId: user.employeeId,
    });
    const issued = this.refreshIssuer.issue();
    await this.refreshTokens.create({
      tokenHash: issued.hash,
      userId: user.id,
      expiresAt: new Date(Date.now() + input.refreshTtlSeconds * 1000),
      userAgent: input.userAgent,
    });
    return { accessToken, refreshToken: issued.raw, user };
  }
}
