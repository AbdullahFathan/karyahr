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
import { AttendanceRecordsTable } from '@/features/attendance/components/attendance-records-table'
import { useAttendanceSummary } from '@/features/attendance/hooks/use-attendance'
import {
  ATTENDANCE_SUMMARY_PERIODS,
  type AttendanceSummaryPeriod,
} from '@/features/attendance/types'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'

export function AttendanceSummaryPage() {
  const canPickEmployee = useHasPermission(PERMISSIONS.EMPLOYEES_READ)
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 }, canPickEmployee)
  const [period, setPeriod] = useState<AttendanceSummaryPeriod>('month')
  const [employeeId, setEmployeeId] = useState<string | undefined>()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const rangeReady = Boolean(from) === Boolean(to)
  const { data, isPending } = useAttendanceSummary(
    {
      period,
      employeeId,
      from: from || undefined,
      to: to || undefined,
    },
    rangeReady,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field>
          <FieldLabel>Period</FieldLabel>
          <Select value={period} onValueChange={(value) => setPeriod(value as AttendanceSummaryPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ATTENDANCE_SUMMARY_PERIODS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {canPickEmployee ? (
          <Field>
            <FieldLabel>Employee</FieldLabel>
            <Select
              value={employeeId ?? 'self'}
              onValueChange={(value) => setEmployeeId(value === 'self' ? undefined : value)}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Self" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="self">Self (default)</SelectItem>
                  {(employees?.data ?? []).map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="sum-from">From (optional)</FieldLabel>
          <Input id="sum-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="sum-to">To (optional)</FieldLabel>
          <Input id="sum-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
        {from || to ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFrom('')
              setTo('')
            }}
          >
            Clear range
          </Button>
        ) : null}
      </div>
      {!rangeReady ? (
        <EmptyState title="Incomplete range" description="Provide both from and to, or neither." />
      ) : isPending ? (
        <Loader />
      ) : !data ? (
        <EmptyState title="No summary" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Present days</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.presentDays}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Late days</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.lateDays}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Early leave days</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.earlyLeaveDays}</CardContent>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            {toDateInputValue(data.from)} – {toDateInputValue(data.to)}
          </p>
          {data.records.length === 0 ? (
            <EmptyState title="No records in this period" />
          ) : (
            <AttendanceRecordsTable records={data.records} />
          )}
        </>
      )}
    </div>
  )
}
