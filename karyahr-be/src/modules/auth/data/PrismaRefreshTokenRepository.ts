import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type {
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from "../domain/repositories/IRefreshTokenRepository";

/**
 * Stores hashed refresh tokens.
 */
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly expiresAt: Date;
    readonly userAgent?: string;
  }): Promise<RefreshTokenRecord> {
    const row = await this.prisma.refreshToken.create({
      data: {
        tokenHash: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
      },
    });
    return {
      id: row.id,
      tokenHash: row.tokenHash,
      userId: row.userId,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    };
  }

  async findActiveByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      tokenHash: row.tokenHash,
      userId: row.userId,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    };
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt },
    });
  }
}
