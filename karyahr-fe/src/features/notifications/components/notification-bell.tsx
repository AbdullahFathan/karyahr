import { Link, useNavigate } from 'react-router-dom'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMyNotifications, useMarkNotificationRead } from '@/features/notifications/hooks/use-notifications'
import { leaveNotificationHref } from '@/features/notifications/href'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { formatDateTime } from '@/lib/dates'

export function NotificationBell() {
  const navigate = useNavigate()
  const canRead = useHasPermission(PERMISSIONS.NOTIFICATIONS_ME)
  const canApproveLeave = useHasPermission(PERMISSIONS.LEAVE_REQUESTS_APPROVE)
  const { data } = useMyNotifications(canRead)
  const markRead = useMarkNotificationRead()

  if (!canRead) {
    return null
  }

  const items = data ?? []
  const unread = items.filter((item) => item.readAt == null).length
  const preview = items.slice(0, 8)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <BellIcon />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          {preview.length === 0 ? (
            <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
          ) : (
            preview.map((item) => {
              const href = leaveNotificationHref(item, canApproveLeave)
              return (
                <DropdownMenuItem
                  key={item.id}
                  className="flex flex-col items-start gap-0.5 whitespace-normal"
                  onClick={() => {
                    if (item.readAt == null) {
                      markRead.mutate(item.id)
                    }
                    if (href) {
                      navigate(href)
                    }
                  }}
                >
                  <span className={item.readAt ? 'font-medium' : 'font-semibold'}>{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.body}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                </DropdownMenuItem>
              )
            })
          )}
          <DropdownMenuItem asChild>
            <Link to="/notifications">View all</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
