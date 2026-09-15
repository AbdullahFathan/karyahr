import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAttendanceDashboard } from '@/features/attendance/hooks/use-attendance'
import type { DashboardRow } from '@/features/attendance/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useLeaveInbox } from '@/features/leave/hooks/use-leave'
import { useJobs } from '@/features/recruitment/hooks/use-recruitment'
import { PERMISSIONS } from '@/lib/permissions'

function snapshotRows(data: {
  readonly present: readonly DashboardRow[]
  readonly late: readonly DashboardRow[]
  readonly absent: readonly DashboardRow[]
}): readonly { readonly employeeId: string; readonly fullName: string; readonly status: string }[] {
  return [
    ...data.present.map((row) => ({ employeeId: row.employeeId, fullName: row.fullName, status: 'Present' })),
    ...data.late.map((row) => ({ employeeId: row.employeeId, fullName: row.fullName, status: 'Late' })),
    ...data.absent.map((row) => ({ employeeId: row.employeeId, fullName: row.fullName, status: 'Absent' })),
  ]
}

export function DashboardPage() {
  const canEmployees = useHasPermission(PERMISSIONS.EMPLOYEES_READ)
  const canAttendance = useHasPermission(PERMISSIONS.ATTENDANCE_DASHBOARD)
  const canLeave = useHasPermission(PERMISSIONS.LEAVE_REQUESTS_APPROVE)
  const canJobs = useHasPermission(PERMISSIONS.RECRUITMENT_JOBS_READ)
  const canProfile = useHasPermission(PERMISSIONS.EMPLOYEES_ME_READ)
  const canPunch = useHasPermission(PERMISSIONS.ATTENDANCE_ME_PUNCH)
  const canMyLeave = useHasPermission(PERMISSIONS.LEAVE_REQUESTS_ME)
  const canPayslips = useHasPermission(PERMISSIONS.PAYSLIPS_ME)
  const employees = useEmployees({ page: 1, pageSize: 1 }, canEmployees)
  const attendance = useAttendanceDashboard({ page: 1, pageSize: 100 }, canAttendance)
  const leave = useLeaveInbox({ page: 1, pageSize: 1 }, canLeave)
  const jobs = useJobs({ page: 1, pageSize: 1, status: 'OPEN' }, canJobs)

  const showKpis = canEmployees || canAttendance || canLeave || canJobs
  const pending =
    (canEmployees && employees.isPending) ||
    (canAttendance && attendance.isPending) ||
    (canLeave && leave.isPending) ||
    (canJobs && jobs.isPending)

  if (!showKpis) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {canProfile ? (
          <Link to="/me">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">My profile</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">View HR fields and change requests.</CardContent>
            </Card>
          </Link>
        ) : null}
        {canPunch ? (
          <Link to="/attendance">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Check-in</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Punch in or out with server time.</CardContent>
            </Card>
          </Link>
        ) : null}
        {canMyLeave ? (
          <Link to="/leave">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">My leave</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Balances and requests.</CardContent>
            </Card>
          </Link>
        ) : null}
        {canPayslips ? (
          <Link to="/payslips">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">My payslips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Download PDF slips.</CardContent>
            </Card>
          </Link>
        ) : null}
        {!canProfile && !canPunch && !canMyLeave && !canPayslips ? (
          <EmptyState title="Dashboard" description="No shortcuts are available for this account." />
        ) : null}
      </div>
    )
  }

  if (pending) {
    return <Loader />
  }

  if (canAttendance && attendance.isError) {
    return <QueryErrorState error={attendance.error} />
  }

  const rows = attendance.data ? snapshotRows(attendance.data) : []

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {canEmployees ? (
          <Link to="/employees">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Employees</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{employees.data?.meta.total ?? '—'}</CardContent>
            </Card>
          </Link>
        ) : null}
        {canAttendance ? (
          <Link to="/attendance/dashboard">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Attendance today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{attendance.data?.present.length ?? '—'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Late {attendance.data?.late.length ?? 0} · Absent {attendance.data?.absent.length ?? 0}
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : null}
        {canLeave ? (
          <Link to="/leave/inbox">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pending leave</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{leave.data?.meta.total ?? '—'}</CardContent>
            </Card>
          </Link>
        ) : null}
        {canJobs ? (
          <Link to="/recruitment/jobs">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Open jobs</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{jobs.data?.meta.total ?? '—'}</CardContent>
            </Card>
          </Link>
        ) : null}
      </div>
      {canAttendance ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Attendance snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance rows for today.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 12).map((row) => (
                    <TableRow key={`${row.status}-${row.employeeId}`}>
                      <TableCell>{row.fullName}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
