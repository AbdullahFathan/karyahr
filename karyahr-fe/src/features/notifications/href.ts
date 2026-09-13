import type { InAppNotification } from '@/features/notifications/types'

/**
 * Returns a leave-related path when the notification points at a leave request.
 */
export function leaveNotificationHref(
  item: InAppNotification,
  canApproveLeave: boolean,
): string | undefined {
  if (item.entityType !== 'LeaveRequest') {
    return undefined
  }
  return canApproveLeave ? '/leave/inbox' : '/leave'
}
