import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useChangeRequestInbox, useReviewChangeRequest } from '@/features/employees/hooks/use-employees'
import { CHANGE_REQUEST_STATUSES, type ChangeRequestStatus } from '@/features/employees/types'

export function ChangeRequestsPage() {
  const [status, setStatus] = useState<ChangeRequestStatus>('PENDING')
  const { data, isPending, isError, error } = useChangeRequestInbox(status)
  const reviewMutation = useReviewChangeRequest()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [rejectId, setRejectId] = useState<string | null>(null)

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} />
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={status} onValueChange={(value) => setStatus((value ?? 'PENDING') as ChangeRequestStatus)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {CHANGE_REQUEST_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {!data || data.length === 0 ? (
        <EmptyState title="No change requests" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Payload</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.employee.fullName}</TableCell>
                <TableCell>{item.employee.employeeNumber}</TableCell>
                <TableCell>{JSON.stringify(item.payload)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.status}</Badge>
                </TableCell>
                <TableCell>
                  {item.status === 'PENDING' ? (
                    <div className="flex flex-col gap-2">
                      <Field>
                        <FieldLabel className="sr-only">Review note</FieldLabel>
                        <Input
                          placeholder="Optional note"
                          value={notes[item.id] ?? ''}
                          onChange={(event) =>
                            setNotes((current) => ({ ...current, [item.id]: event.target.value }))
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
                              id: item.id,
                              action: 'approve',
                              reviewNote: notes[item.id] || undefined,
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
                          onClick={() => setRejectId(item.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    item.reviewNote ?? '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <AlertDialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this change request?</AlertDialogTitle>
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
                  reviewNote: notes[rejectId] || undefined,
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
