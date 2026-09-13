import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AttendanceRecordsTable } from '@/features/attendance/components/attendance-records-table'
import { useMyAttendance } from '@/features/attendance/hooks/use-attendance'
import { todayJakarta } from '@/lib/dates'

export function MyAttendancePage() {
  const today = todayJakarta()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [applied, setApplied] = useState({ from: today, to: today })
  const { data, isPending } = useMyAttendance(applied)

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setApplied({ from, to })
        }}
      >
        <Field>
          <FieldLabel htmlFor="att-from">From</FieldLabel>
          <Input id="att-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="att-to">To</FieldLabel>
          <Input id="att-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Button type="submit">Apply</Button>
      </form>
      {isPending ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No attendance records" description="Choose a date range and apply." />
      ) : (
        <AttendanceRecordsTable records={data} />
      )}
    </div>
  )
}
