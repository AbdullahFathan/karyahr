import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLeaveInbox, useLeaveTypes, useReviewLeaveRequest } from '@/features/leave/hooks/use-leave'
import { toDateInputValue } from '@/lib/dates'

export function LeaveInboxPage() {
  const { data: types } = useLeaveTypes()
  const [page, setPage] = useState(1)
  const { data, isPending } = useLeaveInbox({ page, pageSize: 20 })
  const reviewMutation = useReviewLeaveRequest()
  const [comments, setComments] = useState<Record<string, string>>({})
  const [rejectId, setRejectId] = useState<string | null>(null)
  const typeName = new Map((types ?? []).map((item) => [item.id, item.name]))

  if (isPending) {
    return <Loader />
  }

  return (
    <div className="flex flex-col gap-4">
      {!data || data.data.length === 0 ? (
        <EmptyState title="No leave requests to review" />
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
                <TableHead>Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((request) => (
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
                  <TableCell>
                    {request.status === 'PENDING' ? (
                      <div className="flex flex-col gap-2">
                        <Field>
                          <FieldLabel className="sr-only">Comment</FieldLabel>
                          <Input
                            placeholder="Optional comment"
                            value={comments[request.id] ?? ''}
                            onChange={(event) =>
                              setComments((current) => ({ ...current, [request.id]: event.target.value }))
                            }
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                id: request.id,
                                action: 'approve',
                                comment: comments[request.id] || undefined,
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={reviewMutation.isPending}
                            onClick={() => setRejectId(request.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {data.meta.page} of {data.meta.totalPages || 1}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (data.meta.totalPages || 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
      <AlertDialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this leave request?</AlertDialogTitle>
            <AlertDialogDescription>The employee is notified after you confirm.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!rejectId) {
                  return
                }
                reviewMutation.mutate({
                  id: rejectId,
                  action: 'reject',
                  comment: comments[rejectId] || undefined,
                })
                setRejectId(null)
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
