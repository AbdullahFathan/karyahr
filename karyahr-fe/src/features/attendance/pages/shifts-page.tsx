import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { ShiftFormDialog } from '@/features/attendance/components/shift-form-dialog'
import { formatMinutesOfDay } from '@/features/attendance/format'
import { useCreateShift, useShifts, useUpdateShift } from '@/features/attendance/hooks/use-attendance'
import type { Shift } from '@/features/attendance/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function ShiftsPage() {
  const { data, isPending } = useShifts()
  const canWrite = useHasPermission(PERMISSIONS.ATTENDANCE_SHIFTS_WRITE)
  const createMutation = useCreateShift()
  const updateMutation = useUpdateShift()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Shift | null>(null)

  if (isPending) {
    return <Loader />
  }

  const shifts = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{shifts.length} shifts</p>
        {canWrite ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            Add shift
          </Button>
        ) : null}
      </div>
      {shifts.length === 0 ? (
        <EmptyState title="No shifts" description="Create a shift to assign employees." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Grace</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell>{shift.name}</TableCell>
                <TableCell>{shift.code}</TableCell>
                <TableCell>
                  {formatMinutesOfDay(shift.startMinutes)}–{formatMinutesOfDay(shift.endMinutes)}
                </TableCell>
                <TableCell>
                  {shift.graceMinutesLate}/{shift.graceMinutesEarly} · OT cap {shift.overtimeCapMinutes}
                </TableCell>
                <TableCell className="flex gap-1">
                  <Badge variant={shift.isActive ? 'secondary' : 'outline'}>
                    {shift.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {shift.isFlexible ? <Badge variant="outline">Flexible</Badge> : null}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link to={`/attendance/shifts/${shift.id}/assignments`}>Assignments</Link>
                    </Button>
                    {canWrite ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(shift)
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
                              id: shift.id,
                              input: { isActive: !shift.isActive },
                            })
                          }
                        >
                          {shift.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {dialogOpen ? (
        <ShiftFormDialog
          key={editing?.id ?? 'new-shift'}
          open={dialogOpen}
          shift={editing}
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
