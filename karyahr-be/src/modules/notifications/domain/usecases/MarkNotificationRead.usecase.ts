import { ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error";
import type { InAppNotification } from "../entities/Notification";
import type { INotificationRepository } from "../repositories/INotificationRepository";

/**
 * Marks a notification as read when it belongs to the caller.
 */
export class MarkNotificationReadUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute(id: string, recipientUserId: string): Promise<InAppNotification> {
    const row = await this.notifications.findById(id);
    if (!row) {
      throw new NotFoundError("Notification not found");
    }
    if (row.recipientUserId !== recipientUserId) {
      throw new ForbiddenError();
    }
    if (row.readAt) {
      return row;
    }
    return this.notifications.markRead(id, new Date());
  }
}
