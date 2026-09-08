import type { Shift } from "./entities/Attendance";
import { addWorkDays, jakartaWallToUtc } from "./jakarta-time";

export type ShiftWindow = {
  readonly start: Date;
  readonly end: Date;
};

/**
 * Returns true when the shift crosses midnight (end at or before start).
 */
export function isOvernightShift(shift: Shift): boolean {
  return !shift.isFlexible && shift.endMinutes <= shift.startMinutes;
}

/**
 * Computes the punch window for a shift on a Jakarta work date.
 */
export function shiftWindow(shift: Shift, workDate: Date): ShiftWindow {
  if (shift.isFlexible) {
    return {
      start: jakartaWallToUtc(workDate, 0),
      end: jakartaWallToUtc(addWorkDays(workDate, 1), 0),
    };
  }
  const start = jakartaWallToUtc(workDate, shift.startMinutes);
  const endDate = isOvernightShift(shift) ? addWorkDays(workDate, 1) : workDate;
  const end = jakartaWallToUtc(endDate, shift.endMinutes);
  return { start, end };
}

/**
 * Inclusive window check (flexible end is next midnight, treated as exclusive).
 */
export function isInsideWindow(instant: Date, window: ShiftWindow, exclusiveEnd: boolean): boolean {
  if (instant.getTime() < window.start.getTime()) {
    return false;
  }
  if (exclusiveEnd) {
    return instant.getTime() < window.end.getTime();
  }
  return instant.getTime() <= window.end.getTime();
}

/**
 * Late minutes after scheduled start plus grace.
 */
export function lateMinutes(shift: Shift, window: ShiftWindow, checkedInAt: Date): number {
  if (shift.isFlexible) {
    return 0;
  }
  const threshold = window.start.getTime() + shift.graceMinutesLate * 60_000;
  return Math.max(0, Math.floor((checkedInAt.getTime() - threshold) / 60_000));
}

/**
 * Early-leave minutes before scheduled end minus grace.
 */
export function earlyLeaveMinutes(shift: Shift, window: ShiftWindow, checkedOutAt: Date): number {
  if (shift.isFlexible) {
    return 0;
  }
  const threshold = window.end.getTime() - shift.graceMinutesEarly * 60_000;
  return Math.max(0, Math.floor((threshold - checkedOutAt.getTime()) / 60_000));
}

/**
 * Effective worked minutes between punch times.
 */
export function workedMinutes(checkedInAt: Date, checkedOutAt: Date): number {
  return Math.max(0, Math.floor((checkedOutAt.getTime() - checkedInAt.getTime()) / 60_000));
}
