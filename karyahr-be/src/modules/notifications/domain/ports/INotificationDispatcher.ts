import type { NotificationEvent } from "../entities/Notification";

/**
 * Publishes a notification event for async in-app persist and email.
 */
export type INotificationDispatcher = {
  dispatch(event: NotificationEvent): Promise<void>;
};
