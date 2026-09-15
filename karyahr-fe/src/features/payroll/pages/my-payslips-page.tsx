import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { ListPagination } from '@/components/common/list-pagination'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRupiah } from '@/features/payroll/format'
import { useMyPayslips } from '@/features/payroll/hooks/use-payroll'

export function MyPayslipsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error } = useMyPayslips({
    page,
    pageSize: 20,
    from: from || undefined,
    to: to || undefined,
  })

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} />
  }

  const slips = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm" htmlFor="payslip-from">
            From
          </label>
          <Input
            id="payslip-from"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPage(1)
            }}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm" htmlFor="payslip-to">
            To
          </label>
          <Input
            id="payslip-to"
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPage(1)
            }}
            className="w-44"
          />
        </div>
      </div>
      {slips.length === 0 ? (
        <EmptyState title="No payslips" />
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
              {slips.map((slip) => (
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
          <ListPagination page={page} totalPages={data?.meta.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
