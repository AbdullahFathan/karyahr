import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { CreatePayrollRunDialog } from '@/features/payroll/components/create-payroll-run-dialog'
import { useCreatePayrollRun, usePayrollRuns } from '@/features/payroll/hooks/use-payroll'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'

export function PayrollRunsPage() {
  const canWrite = useHasPermission(PERMISSIONS.PAYROLL_RUNS_WRITE)
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data, isPending, isError } = usePayrollRuns({ page, pageSize: 20 })
  const createMutation = useCreatePayrollRun()

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <EmptyState title="Could not load payroll runs" />
  }

  const runs = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.meta.total ?? 0} runs</p>
        {canWrite ? (
          <Button type="button" onClick={() => setDialogOpen(true)}>
            Queue run
          </Button>
        ) : null}
      </div>
      {runs.length === 0 ? (
        <EmptyState title="No payroll runs" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Skipped</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <Link to={`/payroll/runs/${run.id}`} className="font-medium underline-offset-4 hover:underline">
                      {toDateInputValue(run.periodStart)} – {toDateInputValue(run.periodEnd)}
                    </Link>
                  </TableCell>
                  <TableCell>{run.periodType}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{run.status}</Badge>
                  </TableCell>
                  <TableCell>{run.processedCount}</TableCell>
                  <TableCell>{run.skippedCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {data?.meta.page} of {data?.meta.totalPages || 1}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (data?.meta.totalPages || 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
      {dialogOpen ? (
        <CreatePayrollRunDialog
          open={dialogOpen}
          submitting={createMutation.isPending}
          onOpenChange={setDialogOpen}
          onSubmit={(input) => {
            createMutation.mutate(input, {
              onSuccess: (run) => {
                setDialogOpen(false)
                void navigate(`/payroll/runs/${run.id}`)
              },
            })
          }}
        />
      ) : null}
    </div>
  )
}
