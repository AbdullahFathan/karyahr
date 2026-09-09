export type RefreshTokenRecord = {
  readonly id: string;
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
};

export type IRefreshTokenRepository = {
  create(input: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly expiresAt: Date;
    readonly userAgent?: string;
  }): Promise<RefreshTokenRecord>;
  findActiveByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string, revokedAt: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
};
