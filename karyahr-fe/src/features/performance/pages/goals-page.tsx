import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useDepartments } from '@/features/organization/hooks/use-organization'
import { GoalFormDialog } from '@/features/performance/components/goal-form-dialog'
import { useCreateGoal, useGoals } from '@/features/performance/hooks/use-performance'
import { GOAL_LEVELS, GOAL_STATUSES, type GoalLevel, type GoalStatus } from '@/features/performance/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function GoalsPage() {
  const canWrite = useHasPermission(PERMISSIONS.PERFORMANCE_GOALS_WRITE)
  const { data: departments } = useDepartments()
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 })
  const [level, setLevel] = useState<GoalLevel | undefined>()
  const [status, setStatus] = useState<GoalStatus | undefined>()
  const [departmentId, setDepartmentId] = useState<string | undefined>()
  const [employeeId, setEmployeeId] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const createMutation = useCreateGoal()
  const { data, isPending, isError } = useGoals({
    page,
    pageSize: 20,
    level,
    status,
    departmentId,
    employeeId,
  })
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const employeeName = new Map((employees?.data ?? []).map((item) => [item.id, item.fullName]))

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <EmptyState title="Could not load goals" />
  }

  const goals = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={level ?? 'all'}
            onValueChange={(value) => {
              setLevel(value === 'all' ? undefined : (value as GoalLevel))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All levels</SelectItem>
                {GOAL_LEVELS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={status ?? 'all'}
            onValueChange={(value) => {
              setStatus(value === 'all' ? undefined : (value as GoalStatus))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                {GOAL_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={departmentId ?? 'all'}
            onValueChange={(value) => {
              setDepartmentId(value === 'all' ? undefined : value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All departments</SelectItem>
                {(departments ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={employeeId ?? 'all'}
            onValueChange={(value) => {
              setEmployeeId(value === 'all' ? undefined : value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All employees</SelectItem>
                {(employees?.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.fullName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {canWrite ? (
          <Button type="button" onClick={() => setDialogOpen(true)}>
            Create goal
          </Button>
        ) : null}
      </div>
      {goals.length === 0 ? (
        <EmptyState title="No goals" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell>
                    <Link
                      to={`/performance/goals/${goal.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {goal.title}
                    </Link>
                  </TableCell>
                  <TableCell>{goal.level}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{goal.status}</Badge>
                  </TableCell>
                  <TableCell>{goal.progressPercent}%</TableCell>
                  <TableCell>
                    {goal.employeeId
                      ? (employeeName.get(goal.employeeId) ?? goal.employeeId)
                      : goal.departmentId
                        ? (departmentName.get(goal.departmentId) ?? goal.departmentId)
                        : 'Company'}
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
      <GoalFormDialog
        key={String(dialogOpen)}
        open={dialogOpen}
        submitting={createMutation.isPending}
        onOpenChange={setDialogOpen}
        onSubmit={(input) => {
          createMutation.mutate(input, { onSuccess: () => setDialogOpen(false) })
        }}
      />
    </div>
  )
}
