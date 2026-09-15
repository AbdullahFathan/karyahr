import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMarkNotificationRead, useMyNotifications } from '@/features/notifications/hooks/use-notifications'
import { leaveNotificationHref } from '@/features/notifications/href'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { formatDateTime } from '@/lib/dates'
import { Link } from 'react-router-dom'

export function NotificationsPage() {
  const canApproveLeave = useHasPermission(PERMISSIONS.LEAVE_REQUESTS_APPROVE)
  const { data, isPending, isError, error } = useMyNotifications()
  const markRead = useMarkNotificationRead()

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} />
  }

  const items = data ?? []

  if (items.length === 0) {
    return <EmptyState title="No notifications" description="Leave and other events appear here." />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Body</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const href = leaveNotificationHref(item, canApproveLeave)
          return (
            <TableRow key={item.id} className={item.readAt ? undefined : 'bg-primary/5'}>
              <TableCell className="font-medium">
                {href ? (
                  <Link className="text-primary underline-offset-4 hover:underline" to={href}>
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </TableCell>
              <TableCell className="max-w-md">{item.body}</TableCell>
              <TableCell>{formatDateTime(item.createdAt)}</TableCell>
              <TableCell>{item.readAt ? 'Read' : 'Unread'}</TableCell>
              <TableCell>
                {item.readAt == null ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
