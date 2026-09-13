import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { EMPLOYEE_STATUSES, type EmployeeStatus } from '@/features/employees/types'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { useDebounce } from '@/hooks/use-debounce'

export function EmployeesPage() {
  const canWrite = useHasPermission(PERMISSIONS.EMPLOYEES_WRITE)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState<string | undefined>()
  const [status, setStatus] = useState<EmployeeStatus | undefined>()
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)
  const { data, isPending } = useEmployees({
    search: debouncedSearch,
    departmentId,
    status,
    page,
    pageSize: 20,
  })
  const { data: departments } = useDepartments()
  const { data: positions } = usePositions()
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const positionName = new Map((positions ?? []).map((item) => [item.id, item.name]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search name, number, or national ID"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="w-72"
          />
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
                {(departments ?? []).map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={status ?? 'all'}
            onValueChange={(value) => {
              setStatus(value === 'all' ? undefined : (value as EmployeeStatus))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                {EMPLOYEE_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link to="/employees/new">Add employee</Link>
          </Button>
        ) : null}
      </div>
      {isPending ? (
        <Loader />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No employees" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contract</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Link className="text-primary underline-offset-4 hover:underline" to={`/employees/${employee.id}`}>
                      {employee.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{employee.employeeNumber}</TableCell>
                  <TableCell>{departmentName.get(employee.departmentId) ?? employee.departmentId}</TableCell>
                  <TableCell>{positionName.get(employee.positionId) ?? employee.positionId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{employee.status}</Badge>
                  </TableCell>
                  <TableCell>{employee.contractType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {data.meta.page} of {data.meta.totalPages}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
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
