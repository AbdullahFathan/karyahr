import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAttendanceDashboard } from '@/features/attendance/hooks/use-attendance'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useLeaveInbox } from '@/features/leave/hooks/use-leave'
import { useJobs } from '@/features/recruitment/hooks/use-recruitment'
import { PERMISSIONS } from '@/lib/permissions'

export function DashboardPage() {
  const canEmployees = useHasPermission(PERMISSIONS.EMPLOYEES_READ)
  const canAttendance = useHasPermission(PERMISSIONS.ATTENDANCE_DASHBOARD)
  const canLeave = useHasPermission(PERMISSIONS.LEAVE_REQUESTS_APPROVE)
  const canJobs = useHasPermission(PERMISSIONS.RECRUITMENT_JOBS_READ)
  const employees = useEmployees({ page: 1, pageSize: 1 }, canEmployees)
  const attendance = useAttendanceDashboard({ page: 1, pageSize: 100 }, canAttendance)
  const leave = useLeaveInbox({ page: 1, pageSize: 1 }, canLeave)
  const jobs = useJobs({ page: 1, pageSize: 1, status: 'OPEN' }, canJobs)

  const showAny = canEmployees || canAttendance || canLeave || canJobs
  const pending =
    (canEmployees && employees.isPending) ||
    (canAttendance && attendance.isPending) ||
    (canLeave && leave.isPending) ||
    (canJobs && jobs.isPending)

  if (!showAny) {
    return (
      <EmptyState
        title="Dashboard"
        description="KPI cards appear when you have employees, attendance, leave, or jobs read access."
      />
    )
  }

  if (pending) {
    return <Loader />
  }

  return (
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
  )
}
