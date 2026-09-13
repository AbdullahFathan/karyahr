import { useMutation, useQuery } from '@tanstack/react-query'
import { listMyNotifications, markNotificationRead } from '@/features/notifications/api/notifications'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

const POLL_MS = 30_000

export function useMyNotifications(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.me,
    queryFn: listMyNotifications,
    enabled,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.me }),
  })
}
