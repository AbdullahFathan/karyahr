import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LeaveTypeFormDialog } from '@/features/leave/components/leave-type-form-dialog'
import { useCreateLeaveType, useLeaveTypes, useUpdateLeaveType } from '@/features/leave/hooks/use-leave'
import type { LeaveType } from '@/features/leave/types'

export function LeaveTypesPage() {
  const { data, isPending } = useLeaveTypes()
  const createMutation = useCreateLeaveType()
  const updateMutation = useUpdateLeaveType()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveType | null>(null)

  if (isPending) {
    return <Loader />
  }

  const types = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{types.length} leave types</p>
        <Button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          Add type
        </Button>
      </div>
      {types.length === 0 ? (
        <EmptyState title="No leave types" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Attachment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow key={type.id}>
                <TableCell>{type.code}</TableCell>
                <TableCell>{type.name}</TableCell>
                <TableCell>{type.requiresBalance ? 'Yes' : 'No'}</TableCell>
                <TableCell>{type.requiresAttachment ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Badge variant={type.isActive ? 'secondary' : 'outline'}>
                    {type.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(type)
                        setDialogOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void updateMutation.mutate({
                          id: type.id,
                          input: { isActive: !type.isActive },
                        })
                      }
                    >
                      {type.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {dialogOpen ? (
        <LeaveTypeFormDialog
          key={editing?.id ?? 'new-type'}
          open={dialogOpen}
          leaveType={editing}
          submitting={createMutation.isPending || updateMutation.isPending}
          onOpenChange={setDialogOpen}
          onSubmit={(input) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, input }, { onSuccess: () => setDialogOpen(false) })
              return
            }
            createMutation.mutate(input, { onSuccess: () => setDialogOpen(false) })
          }}
        />
      ) : null}
    </div>
  )
}
