export const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type JakartaParts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly minuteOfDay: number;
};

/**
 * Splits an instant into Asia/Jakarta calendar parts (UTC+7, no DST).
 */
export function toJakartaParts(instant: Date): JakartaParts {
  const shifted = new Date(instant.getTime() + JAKARTA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/**
 * Stores a Jakarta calendar date as UTC midnight for Prisma `@db.Date`.
 */
export function jakartaDateToWorkDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Returns the Jakarta calendar date of an instant as a work-date value.
 */
export function workDateFromInstant(instant: Date): Date {
  const parts = toJakartaParts(instant);
  return jakartaDateToWorkDate(parts.year, parts.month, parts.day);
}

/**
 * Adds whole UTC days to a `@db.Date` work date.
 */
export function addWorkDays(workDate: Date, days: number): Date {
  return new Date(
    Date.UTC(workDate.getUTCFullYear(), workDate.getUTCMonth(), workDate.getUTCDate() + days),
  );
}

/**
 * Converts Jakarta wall-clock minutes on a work date to a UTC instant.
 */
export function jakartaWallToUtc(workDate: Date, minutesFromMidnight: number): Date {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  return new Date(
    Date.UTC(
      workDate.getUTCFullYear(),
      workDate.getUTCMonth(),
      workDate.getUTCDate(),
      hours,
      minutes,
    ) - JAKARTA_OFFSET_MS,
  );
}

/**
 * Inclusive calendar-day count between two work dates.
 */
export function inclusiveWorkDays(start: Date, end: Date): number {
  const ms =
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  return Math.floor(ms / 86_400_000) + 1;
}

/**
 * Formats a work date as YYYY-MM-DD.
 */
export function formatWorkDate(workDate: Date): string {
  const year = workDate.getUTCFullYear();
  const month = String(workDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(workDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a work date.
 */
export function parseWorkDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid date ${value}`);
  }
  return jakartaDateToWorkDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/**
 * Year-month key YYYYMM in Jakarta for accrual idempotency.
 */
export function jakartaYearMonth(instant: Date): number {
  const parts = toJakartaParts(instant);
  return parts.year * 100 + parts.month;
}
