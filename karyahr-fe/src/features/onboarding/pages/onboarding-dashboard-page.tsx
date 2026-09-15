import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { ListPagination } from '@/components/common/list-pagination'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useOnboardingDashboard } from '@/features/onboarding/hooks/use-onboarding'
import { useEmployees } from '@/features/employees/hooks/use-employees'

export function OnboardingDashboardPage() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error } = useOnboardingDashboard({ page, pageSize: 20 })
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 })
  const employeeName = new Map((employees?.data ?? []).map((item) => [item.id, item.fullName]))

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} />
  }

  const rows = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <EmptyState title="No onboarding processes" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.processId}>
                  <TableCell>
                    <Link
                      to={`/onboarding/${row.employeeId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {employeeName.get(row.employeeId) ?? row.employeeId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.completedCount}/{row.totalCount} ({Math.round(row.progress * 100)}%)
                  </TableCell>
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
