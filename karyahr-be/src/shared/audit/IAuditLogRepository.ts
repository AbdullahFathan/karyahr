export type AuditRecord = {
  readonly actorUserId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly metadata?: Record<string, unknown>;
};

/**
 * Persists audit trail entries.
 */
export type IAuditLogRepository = {
  append(record: AuditRecord): Promise<void>;
};
