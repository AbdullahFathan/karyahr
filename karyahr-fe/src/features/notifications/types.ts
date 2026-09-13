export const NOTIFICATION_EMAIL_STATUSES = ['PENDING', 'SENT', 'SKIPPED', 'FAILED'] as const
export type NotificationEmailStatus = (typeof NOTIFICATION_EMAIL_STATUSES)[number]

export type InAppNotification = {
  readonly id: string
  readonly recipientUserId: string
  readonly type: string
  readonly title: string
  readonly body: string
  readonly entityType: string
  readonly entityId: string
  readonly readAt: string | null
  readonly emailStatus: NotificationEmailStatus
  readonly createdAt: string
}
