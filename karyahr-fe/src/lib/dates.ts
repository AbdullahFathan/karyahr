/**
 * Formats an ISO date string for HTML date inputs (`YYYY-MM-DD`).
 */
export function toDateInputValue(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return value.slice(0, 10)
}
