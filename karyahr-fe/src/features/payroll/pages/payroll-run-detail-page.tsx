import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { formatRupiah, isTerminalPayrollStatus } from '@/features/payroll/format'
import {
  useDownloadPayrollExport,
  usePayrollRun,
  useRunPayslips,
} from '@/features/payroll/hooks/use-payroll'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'
import { Spinner } from '@/components/ui/spinner'
import { queryClient } from '@/services/query/query-client'

export function PayrollRunDetailPage() {
  const { id = '' } = useParams()
  const canExport = useHasPermission(PERMISSIONS.PAYROLL_EXPORT)
  const { data: run, isPending, isError } = usePayrollRun(id)
  const [page, setPage] = useState(1)
  const { data: payslips, isPending: payslipsPending } = useRunPayslips(id, { page, pageSize: 20 }, Boolean(run))
  const exportMutation = useDownloadPayrollExport()

  useEffect(() => {
    if (!run || !isTerminalPayrollStatus(run.status)) {
      return
    }
    void queryClient.invalidateQueries({ queryKey: ['payroll', 'run', id, 'payslips'] })
  }, [id, run?.status])

  if (isPending) {
    return <Loader />
  }
  if (isError || !run) {
    return <EmptyState title="Payroll run not found" />
  }

  const year = Number(toDateInputValue(run.periodStart).slice(0, 4))
  const polling = !isTerminalPayrollStatus(run.status)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {toDateInputValue(run.periodStart)} – {toDateInputValue(run.periodEnd)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{run.periodType}</Badge>
            <Badge variant="secondary">{run.status}</Badge>
            {polling ? <span className="text-sm text-muted-foreground">Processing…</span> : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Processed {run.processedCount} · Skipped {run.skippedCount}
          </p>
          {run.errorMessage ? <p className="mt-2 text-sm text-destructive">{run.errorMessage}</p> : null}
        </div>
        {canExport ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportMutation.isPending}
              onClick={() => void exportMutation.mutate({ runId: id, kind: 'accounting' })}
            >
              {exportMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
              Accounting CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportMutation.isPending}
              onClick={() => void exportMutation.mutate({ runId: id, kind: 'pph21' })}
            >
              PPh 21 monthly
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportMutation.isPending}
              onClick={() => void exportMutation.mutate({ runId: id, kind: 'a1', year })}
            >
              1721-A1
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportMutation.isPending}
              onClick={() => void exportMutation.mutate({ runId: id, kind: 'bank' })}
            >
              Bank transfer
            </Button>
          </div>
        ) : null}
      </div>

      {run.skipReasons.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold">Skip reasons</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.skipReasons.map((skip) => (
                <TableRow key={`${skip.employeeId}-${skip.reason}`}>
                  <TableCell>
                    <Link to={`/employees/${skip.employeeId}?tab=payroll`} className="underline-offset-4 hover:underline">
                      {skip.employeeId}
                    </Link>
                  </TableCell>
                  <TableCell>{skip.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {payslipsPending ? (
        <Loader />
      ) : !payslips || payslips.data.length === 0 ? (
        <EmptyState title="No payslips yet" description={polling ? 'Payslips appear when processing finishes.' : undefined} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payslip</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Statutory</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.data.map((slip) => (
                <TableRow key={slip.id}>
                  <TableCell>
                    <Link to={`/payslips/${slip.id}`} className="font-medium underline-offset-4 hover:underline">
                      {slip.id}
                    </Link>
                  </TableCell>
                  <TableCell>{formatRupiah(slip.grossRupiah)}</TableCell>
                  <TableCell>{formatRupiah(slip.statutoryRupiah)}</TableCell>
                  <TableCell>{formatRupiah(slip.netRupiah)}</TableCell>
                  <TableCell>{slip.pdfObjectKey ? 'Ready' : 'Pending'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {payslips.meta.page} of {payslips.meta.totalPages || 1}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (payslips.meta.totalPages || 1)}
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
