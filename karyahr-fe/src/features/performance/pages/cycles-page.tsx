import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CycleFormDialog } from '@/features/performance/components/cycle-form-dialog'
import {
  useCreateCycle,
  useCycles,
  useLockCycle,
  useOpenCycle,
  useUpdateCycle,
} from '@/features/performance/hooks/use-performance'
import type { PerformanceCycle } from '@/features/performance/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { toDateInputValue } from '@/lib/dates'
import { PERMISSIONS } from '@/lib/permissions'

export function CyclesPage() {
  const canWrite = useHasPermission(PERMISSIONS.PERFORMANCE_CYCLES_WRITE)
  const { data, isPending, isError, error } = useCycles()
  const createMutation = useCreateCycle()
  const updateMutation = useUpdateCycle()
  const openMutation = useOpenCycle()
  const lockMutation = useLockCycle()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PerformanceCycle | null>(null)
  const [lockTarget, setLockTarget] = useState<PerformanceCycle | null>(null)

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} />
  }

  const cycles = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cycles.length} cycles</p>
        {canWrite ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            Create cycle
          </Button>
        ) : null}
      </div>
      {cycles.length === 0 ? (
        <EmptyState title="No cycles" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles.map((cycle) => (
              <TableRow key={cycle.id}>
                <TableCell>{cycle.name}</TableCell>
                <TableCell>{cycle.periodType}</TableCell>
                <TableCell>
                  {toDateInputValue(cycle.startsAt)} – {toDateInputValue(cycle.endsAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{cycle.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {canWrite && cycle.status === 'DRAFT' ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(cycle)
                            setDialogOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openMutation.mutate(cycle.id)}
                          disabled={openMutation.isPending}
                        >
                          Open
                        </Button>
                      </>
                    ) : null}
                    {canWrite && cycle.status === 'OPEN' ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setLockTarget(cycle)}>
                        Lock
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <CycleFormDialog
        key={`${dialogOpen}-${editing?.id ?? 'new'}`}
        open={dialogOpen}
        cycle={editing}
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
      <AlertDialog open={Boolean(lockTarget)} onOpenChange={(open) => !open && setLockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              OPEN cycles become LOCKED. New ratings cannot be submitted after lock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!lockTarget) {
                  return
                }
                lockMutation.mutate(lockTarget.id, { onSuccess: () => setLockTarget(null) })
              }}
            >
              Lock cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
