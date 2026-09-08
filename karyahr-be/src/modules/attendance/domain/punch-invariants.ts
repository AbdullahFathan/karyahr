import { ConflictError, ValidationError } from "../../../shared/errors/app-error";
import type { AttendanceRecord, Shift } from "./entities/Attendance";
import { isInsideWindow, type ShiftWindow } from "./shift-window";

/**
 * Rejects a second open or existing record for the same work date.
 */
export function assertNoExistingRecord(existing: AttendanceRecord | null): void {
  if (existing) {
    throw new ConflictError("Attendance already recorded for this work date");
  }
}

/**
 * Requires an open attendance record before check-out.
 */
export function assertOpenRecord(existing: AttendanceRecord | null): AttendanceRecord {
  if (!existing || existing.status !== "OPEN") {
    throw new ValidationError("No open check-in to close");
  }
  return existing;
}

/**
 * Rejects punches outside the configured shift window.
 */
export function assertInsideShiftWindow(
  instant: Date,
  shift: Shift,
  window: ShiftWindow,
): void {
  const exclusiveEnd = shift.isFlexible;
  if (!isInsideWindow(instant, window, exclusiveEnd)) {
    throw new ValidationError("Action is outside the assigned shift window");
  }
}

/**
 * Rejects check-in when approved leave covers the work date.
 */
export function assertNotOnApprovedLeave(onLeave: boolean): void {
  if (onLeave) {
    throw new ConflictError("Cannot check in while on approved leave");
  }
}

/**
 * Requires an active shift assignment.
 */
export function assertShiftAssigned<T>(assignment: T | null): T {
  if (!assignment) {
    throw new ValidationError("No shift assigned for this work date");
  }
  return assignment;
}
