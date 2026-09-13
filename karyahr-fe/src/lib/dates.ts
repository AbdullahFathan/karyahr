/**
 * Formats an ISO date string for HTML date inputs (`YYYY-MM-DD`).
 */
export function toDateInputValue(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return value.slice(0, 10)
}

/**
 * Returns today's work date in Asia/Jakarta as `YYYY-MM-DD`.
 */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

/**
 * Formats an ISO timestamp for display, or an em dash when empty.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
