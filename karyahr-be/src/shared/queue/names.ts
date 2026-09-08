export const QUEUE_NAMES = {
  notifications: "notifications",
  leaveAccrual: "leave-accrual",
  payroll: "payroll",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
