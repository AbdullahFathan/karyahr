import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import type { ApiEnvelope } from '@/types/api'
import type { InAppNotification } from '@/features/notifications/types'

export async function listMyNotifications(): Promise<readonly InAppNotification[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly InAppNotification[]>>(endpoints.notificationsMe)
  return data.data
}

export async function markNotificationRead(id: string): Promise<InAppNotification> {
  const { data } = await apiClient.patch<ApiEnvelope<InAppNotification>>(endpoints.notificationRead(id))
  return data.data
}
