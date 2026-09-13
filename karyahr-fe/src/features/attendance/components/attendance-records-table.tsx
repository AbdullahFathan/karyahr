import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { attendanceHelperText } from '@/features/attendance/format'
import type { AttendanceRecord } from '@/features/attendance/types'
import { formatDateTime, toDateInputValue } from '@/lib/dates'

type AttendanceRecordsTableProps = {
  readonly records: readonly AttendanceRecord[]
}

export function AttendanceRecordsTable({ records }: AttendanceRecordsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Worked</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell>{toDateInputValue(record.workDate)}</TableCell>
            <TableCell>{formatDateTime(record.checkedInAt)}</TableCell>
            <TableCell>{formatDateTime(record.checkedOutAt)}</TableCell>
            <TableCell>
              <Badge variant={record.status === 'OPEN' ? 'secondary' : 'outline'}>{record.status}</Badge>
            </TableCell>
            <TableCell>{record.workedMinutes == null ? '—' : `${record.workedMinutes} min`}</TableCell>
            <TableCell className="text-muted-foreground">{attendanceHelperText(record) ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
