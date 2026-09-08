import type { Prisma, PrismaClient } from "../../../prisma/generated/prisma/client";
import type { AuditRecord, IAuditLogRepository } from "./IAuditLogRepository";

/**
 * Stores audit logs with Prisma.
 */
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(record: AuditRecord): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: record.actorUserId,
        entityType: record.entityType,
        entityId: record.entityId,
        action: record.action,
        metadata: toJsonValue(record.metadata),
      },
    });
  }
}

function toJsonValue(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (metadata === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
}
