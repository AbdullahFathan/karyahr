export const QUEUE_NAMES = {
  notifications: "notifications",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
