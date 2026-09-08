import type { IRefreshTokenIssuer } from "../ports/AuthPorts";
import type { IRefreshTokenRepository } from "../repositories/IRefreshTokenRepository";

/**
 * Revokes the current refresh token.
 */
export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly refreshIssuer: IRefreshTokenIssuer,
  ) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const existing = await this.refreshTokens.findActiveByHash(
      this.refreshIssuer.hash(refreshToken),
    );
    if (existing) {
      await this.refreshTokens.revoke(existing.id, new Date());
    }
  }
}
