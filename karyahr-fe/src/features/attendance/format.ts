/**
 * Formats minutes from midnight as `HH:MM`.
 */
export function formatMinutesOfDay(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Builds helper text for late or early-leave minutes.
 */
export function attendanceHelperText(record: {
  readonly lateMinutes: number
  readonly earlyLeaveMinutes: number
  readonly overtimeMinutes: number
}): string | null {
  const parts: string[] = []
  if (record.lateMinutes > 0) {
    parts.push(`Late ${record.lateMinutes} min`)
  }
  if (record.earlyLeaveMinutes > 0) {
    parts.push(`Left early ${record.earlyLeaveMinutes} min`)
  }
  if (record.overtimeMinutes > 0) {
    parts.push(`OT ${record.overtimeMinutes} min`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
