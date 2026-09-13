import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
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
import { useAttendanceDashboard, useExportAttendanceCsv } from '@/features/attendance/hooks/use-attendance'
import type { DashboardRow } from '@/features/attendance/types'
import { useDepartments } from '@/features/organization/hooks/use-organization'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { todayJakarta, toDateInputValue } from '@/lib/dates'

function BucketTable({ title, rows }: { readonly title: string; readonly rows: readonly DashboardRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.employeeId}>
                  <TableCell>{row.fullName}</TableCell>
                  <TableCell>{row.employeeNumber}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function AttendanceDashboardPage() {
  const canReadHrAttendance = useHasPermission(PERMISSIONS.ATTENDANCE_READ)
  const canReadOrg = useHasPermission(PERMISSIONS.ORG_READ)
  const canFilterDept = canReadHrAttendance && canReadOrg
  const canExport = useHasPermission(PERMISSIONS.ATTENDANCE_EXPORT)
  const { data: departments } = useDepartments(canFilterDept)
  const [departmentId, setDepartmentId] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [exportFrom, setExportFrom] = useState(todayJakarta())
  const [exportTo, setExportTo] = useState(todayJakarta())
  const { data, isPending } = useAttendanceDashboard({
    departmentId,
    page,
    pageSize: 20,
  })
  const exportMutation = useExportAttendanceCsv()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {canFilterDept ? (
            <Select
              value={departmentId ?? 'all'}
              onValueChange={(value) => {
                setDepartmentId(value === 'all' ? undefined : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-56">
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
          ) : null}
          {data ? (
            <p className="text-sm text-muted-foreground">Work date {toDateInputValue(data.workDate)}</p>
          ) : null}
        </div>
        {canExport ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void exportMutation.mutate({ from: exportFrom, to: exportTo })
            }}
          >
            <Field>
              <FieldLabel htmlFor="export-from">Export from</FieldLabel>
              <Input
                id="export-from"
                type="date"
                value={exportFrom}
                onChange={(event) => setExportFrom(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="export-to">To</FieldLabel>
              <Input
                id="export-to"
                type="date"
                value={exportTo}
                onChange={(event) => setExportTo(event.target.value)}
              />
            </Field>
            <Button type="submit" variant="outline" disabled={exportMutation.isPending}>
              Export CSV
            </Button>
          </form>
        ) : null}
      </div>
      {isPending ? (
        <Loader />
      ) : !data ? (
        <EmptyState title="No dashboard data" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <BucketTable title="Present" rows={data.present} />
            <BucketTable title="Late" rows={data.late} />
            <BucketTable title="Absent" rows={data.absent} />
            <BucketTable title="On leave" rows={data.onLeave} />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {data.meta.page} of {data.meta.totalPages || 1}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (data.meta.totalPages || 1)}
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
