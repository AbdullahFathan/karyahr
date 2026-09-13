import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
  const { data, isPending } = useChangeRequestInbox(status)
  const reviewMutation = useReviewChangeRequest()
  const [notes, setNotes] = useState<Record<string, string>>({})

  if (isPending) {
    return <Loader />
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
                          onClick={() =>
                            reviewMutation.mutate({
                              id: item.id,
                              action: 'reject',
                              reviewNote: notes[item.id] || undefined,
                            })
                          }
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
    </div>
  )
}
