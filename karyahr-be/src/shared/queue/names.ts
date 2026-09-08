export const QUEUE_NAMES = {
  notifications: "notifications",
  leaveAccrual: "leave-accrual",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
