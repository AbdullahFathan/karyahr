import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLeaveTypes, useMyLeaveBalances, useMyLeaveRequests } from '@/features/leave/hooks/use-leave'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'

export function MyLeavePage() {
  const canCreate = useHasPermission(PERMISSIONS.LEAVE_REQUESTS_CREATE)
  const { data: types } = useLeaveTypes()
  const { data: balances, isPending: balancesPending } = useMyLeaveBalances()
  const [page, setPage] = useState(1)
  const { data: requests, isPending: requestsPending } = useMyLeaveRequests({ page, pageSize: 20 })
  const typeName = new Map((types ?? []).map((item) => [item.id, item.name]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Balances for the current year</p>
        {canCreate ? (
          <Button type="button" asChild>
            <Link to="/leave/new">New request</Link>
          </Button>
        ) : null}
      </div>
      {balancesPending ? (
        <Loader />
      ) : !balances || balances.length === 0 ? (
        <EmptyState title="No leave balances" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((balance) => (
            <Card key={balance.id}>
              <CardHeader>
                <CardTitle>{typeName.get(balance.leaveTypeId) ?? balance.leaveTypeId}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Entitled {balance.entitledDays}</p>
                <p>Used {balance.usedDays}</p>
                <p>Pending {balance.pendingDays}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {requestsPending ? (
        <Loader />
      ) : !requests || requests.data.length === 0 ? (
        <EmptyState title="No leave requests" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.data.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{typeName.get(request.leaveTypeId) ?? request.leaveTypeId}</TableCell>
                  <TableCell>
                    {toDateInputValue(request.startDate)} – {toDateInputValue(request.endDate)}
                  </TableCell>
                  <TableCell>{request.days}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{request.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {requests.meta.page} of {requests.meta.totalPages || 1}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (requests.meta.totalPages || 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
