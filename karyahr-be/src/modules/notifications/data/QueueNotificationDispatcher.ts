import { enqueueNotification } from "../../../shared/queue/producer";
import type { NotificationEvent } from "../domain/entities/Notification";
import type { INotificationDispatcher } from "../domain/ports/INotificationDispatcher";

/**
 * Dispatches notification events onto the BullMQ notifications queue.
 */
export class QueueNotificationDispatcher implements INotificationDispatcher {
  async dispatch(event: NotificationEvent): Promise<void> {
    await enqueueNotification(event);
  }
}
