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
import { useOnboardingDashboard } from '@/features/onboarding/hooks/use-onboarding'
import { useEmployees } from '@/features/employees/hooks/use-employees'

export function OnboardingDashboardPage() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError } = useOnboardingDashboard({ page, pageSize: 20 })
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 })
  const employeeName = new Map((employees?.data ?? []).map((item) => [item.id, item.fullName]))

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <EmptyState title="Could not load onboarding" />
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
    </div>
  )
}
