import type { InAppNotification } from "../entities/Notification";
import type { INotificationRepository } from "../repositories/INotificationRepository";

/**
 * Lists in-app notifications for the authenticated user.
 */
export class ListMyNotificationsUseCase {
  constructor(private readonly notifications: INotificationRepository) {}

  execute(recipientUserId: string): Promise<readonly InAppNotification[]> {
    return this.notifications.listByRecipient(recipientUserId);
  }
}
