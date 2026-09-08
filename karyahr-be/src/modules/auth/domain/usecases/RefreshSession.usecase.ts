import { UnauthorizedError } from "../../../../shared/errors/app-error";
import type { IAccessTokenSigner, IRefreshTokenIssuer } from "../ports/AuthPorts";
import type { IRefreshTokenRepository } from "../repositories/IRefreshTokenRepository";
import type { IUserRepository } from "../repositories/IUserRepository";
import type { SessionTokens } from "./Login.usecase";

export type RefreshSessionInput = {
  readonly refreshToken: string;
  readonly refreshTtlSeconds: number;
  readonly userAgent?: string;
};

/**
 * Rotates a refresh token and issues a new access token.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly accessTokens: IAccessTokenSigner,
    private readonly refreshIssuer: IRefreshTokenIssuer,
  ) {}

  async execute(input: RefreshSessionInput): Promise<SessionTokens> {
    const hash = this.refreshIssuer.hash(input.refreshToken);
    const existing = await this.refreshTokens.findActiveByHash(hash);
    if (!existing || existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("Invalid refresh token");
    }
    const user = await this.users.findById(existing.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid refresh token");
    }
    await this.refreshTokens.revoke(existing.id, new Date());
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
