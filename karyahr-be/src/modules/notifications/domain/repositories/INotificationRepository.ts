import type { InAppNotification, NotificationEmailStatus } from "../entities/Notification";

export type CreateNotificationInput = {
  readonly recipientUserId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly entityType: string;
  readonly entityId: string;
};

export type INotificationRepository = {
  create(input: CreateNotificationInput): Promise<InAppNotification>;
  findById(id: string): Promise<InAppNotification | null>;
  listByRecipient(recipientUserId: string): Promise<readonly InAppNotification[]>;
  markRead(id: string, readAt: Date): Promise<InAppNotification>;
  updateEmailStatus(id: string, emailStatus: NotificationEmailStatus): Promise<void>;
};
