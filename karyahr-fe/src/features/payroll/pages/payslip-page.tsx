import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
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
import { formatRupiah } from '@/features/payroll/format'
import { useDownloadPayslipPdf, usePayslip } from '@/features/payroll/hooks/use-payroll'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { Spinner } from '@/components/ui/spinner'

export function PayslipPage() {
  const { id = '' } = useParams()
  const { data, isPending, isError, error } = usePayslip(id)
  const downloadMutation = useDownloadPayslipPdf()
  const canReadRuns = useHasPermission(PERMISSIONS.PAYROLL_RUNS_READ)

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} notFoundTitle="Payslip not found" />
  }
  if (!data) {
    return <EmptyState title="Payslip not found" />
  }

  const pdfReady = Boolean(data.pdfObjectKey)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {canReadRuns ? (
            <p className="text-sm text-muted-foreground">
              Run{' '}
              <Link to={`/payroll/runs/${data.payrollRunId}`} className="underline-offset-4 hover:underline">
                {data.payrollRunId}
              </Link>
            </p>
          ) : null}
          <div className="mt-3 grid gap-1 text-sm">
            <p>Gross {formatRupiah(data.grossRupiah)}</p>
            <p>Statutory {formatRupiah(data.statutoryRupiah)}</p>
            <p className="font-semibold">Net {formatRupiah(data.netRupiah)}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button
            type="button"
            disabled={!pdfReady || downloadMutation.isPending}
            onClick={() => void downloadMutation.mutate(id)}
          >
            {downloadMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
            Download PDF
          </Button>
          {!pdfReady ? (
            <p className="text-sm text-muted-foreground">Payslip PDF is not ready yet.</p>
          ) : null}
        </div>
      </div>
      {data.lines.length === 0 ? (
        <EmptyState title="No payslip lines" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.lines.map((line, index) => (
              <TableRow key={`${line.code}-${line.kind}-${index}`}>
                <TableCell>{line.code}</TableCell>
                <TableCell>{line.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{line.kind}</Badge>
                </TableCell>
                <TableCell>{formatRupiah(line.amountRupiah)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
