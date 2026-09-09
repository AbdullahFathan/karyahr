export const NOTIFICATION_EMAIL_STATUSES = ["PENDING", "SENT", "SKIPPED", "FAILED"] as const;
export type NotificationEmailStatus = (typeof NOTIFICATION_EMAIL_STATUSES)[number];

export const NOTIFICATION_JOB_TYPES = [
  "leave.submitted",
  "leave.decided",
  "payroll.payslip_ready",
  "recruitment.application_received",
  "recruitment.stage_changed",
  "recruitment.decision",
  "performance.goal_submitted",
  "performance.goal_decided",
  "performance.review_opened",
  "performance.rating_submitted",
] as const;
export type NotificationJobType = (typeof NOTIFICATION_JOB_TYPES)[number];

export type InAppNotification = {
  readonly id: string;
  readonly recipientUserId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly readAt: Date | null;
  readonly emailStatus: NotificationEmailStatus;
  readonly createdAt: Date;
};

export type NotificationEvent = {
  readonly type: NotificationJobType;
  readonly recipientUserId?: string;
  readonly recipientEmail?: string;
  readonly title: string;
  readonly body: string;
  readonly entityType: string;
  readonly entityId: string;
};
