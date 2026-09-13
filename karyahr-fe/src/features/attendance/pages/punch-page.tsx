import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/common/loader'
import { attendanceHelperText } from '@/features/attendance/format'
import { useCheckIn, useCheckOut, useMyAttendance } from '@/features/attendance/hooks/use-attendance'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { formatDateTime, todayJakarta } from '@/lib/dates'

export function PunchPage() {
  const today = todayJakarta()
  const canRead = useHasPermission(PERMISSIONS.ATTENDANCE_ME_READ)
  const { data, isPending } = useMyAttendance({ from: today, to: today }, canRead)
  const checkInMutation = useCheckIn()
  const checkOutMutation = useCheckOut()
  const todayRecord = data?.find((record) => record.status === 'OPEN') ?? data?.[0]
  const isOpen = todayRecord?.status === 'OPEN'
  const busy = checkInMutation.isPending || checkOutMutation.isPending

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
          <CardDescription>{today} · timestamps use server time</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canRead && isPending ? (
            <Loader />
          ) : todayRecord ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={isOpen ? 'secondary' : 'outline'}>{todayRecord.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {attendanceHelperText(todayRecord) ?? 'On time'}
                </span>
              </div>
              <p className="text-sm">Check-in {formatDateTime(todayRecord.checkedInAt)}</p>
              <p className="text-sm">Check-out {formatDateTime(todayRecord.checkedOutAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance record yet today.</p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              className="h-20 text-base"
              disabled={busy || isOpen}
              onClick={() => void checkInMutation.mutate()}
            >
              Check in
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-20 text-base"
              disabled={busy || !isOpen}
              onClick={() => void checkOutMutation.mutate()}
            >
              Check out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
