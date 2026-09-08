import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { InAppNotification, NotificationEmailStatus } from "../domain/entities/Notification";
import type {
  CreateNotificationInput,
  INotificationRepository,
} from "../domain/repositories/INotificationRepository";

function toNotification(row: InAppNotification): InAppNotification {
  return row;
}

/**
 * Notification persistence with Prisma.
 */
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateNotificationInput): Promise<InAppNotification> {
    return toNotification(await this.prisma.notification.create({ data: input }));
  }

  async findById(id: string): Promise<InAppNotification | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toNotification(row) : null;
  }

  async listByRecipient(recipientUserId: string): Promise<readonly InAppNotification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { recipientUserId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toNotification);
  }

  async markRead(id: string, readAt: Date): Promise<InAppNotification> {
    return toNotification(await this.prisma.notification.update({ where: { id }, data: { readAt } }));
  }

  async updateEmailStatus(id: string, emailStatus: NotificationEmailStatus): Promise<void> {
    await this.prisma.notification.update({ where: { id }, data: { emailStatus } });
  }
}
