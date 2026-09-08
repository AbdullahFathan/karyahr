import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { AttendanceRecord, Shift, ShiftAssignment } from "../entities/Attendance";
import { addWorkDays, workDateFromInstant } from "../jakarta-time";
import {
  assertInsideShiftWindow,
  assertNoExistingRecord,
  assertNotOnApprovedLeave,
  assertOpenRecord,
  assertShiftAssigned,
} from "../punch-invariants";
import type { IApprovedLeaveLookup } from "../ports/IApprovedLeaveLookup";
import type {
  IAttendanceRecordRepository,
  IShiftAssignmentRepository,
  IShiftRepository,
} from "../repositories/IAttendanceRepository";
import {
  checkOutWindow,
  earlyLeaveMinutes,
  lateMinutes,
  overtimeMinutes,
  shiftWindow,
  workedMinutes,
} from "../shift-window";

export type Clock = () => Date;

async function resolvePunchContext(
  employeeId: string,
  now: Date,
  assignments: IShiftAssignmentRepository,
  shifts: IShiftRepository,
): Promise<{ assignment: ShiftAssignment; shift: Shift; workDate: Date }> {
  const today = workDateFromInstant(now);
  const candidates = [today, addWorkDays(today, -1)];
  for (const workDate of candidates) {
    const assignment = await assignments.findActiveOnDate(employeeId, workDate);
    if (!assignment) {
      continue;
    }
    const shift = await shifts.findById(assignment.shiftId);
    if (!shift || !shift.isActive) {
      continue;
    }
    const window = shiftWindow(shift, workDate);
    const exclusiveEnd = shift.isFlexible;
    const inside =
      now.getTime() >= window.start.getTime() &&
      (exclusiveEnd ? now.getTime() < window.end.getTime() : now.getTime() <= window.end.getTime());
    if (inside) {
      return { assignment, shift, workDate };
    }
  }
  const fallback = await assignments.findActiveOnDate(employeeId, today);
  const assignment = assertShiftAssigned(fallback);
  const shift = await shifts.findById(assignment.shiftId);
  if (!shift || !shift.isActive) {
    throw new ValidationError("Assigned shift is inactive");
  }
  return { assignment, shift, workDate: today };
}

/**
 * Records check-in using server time and the employee's assigned shift.
 */
export class CheckInUseCase {
  constructor(
    private readonly assignments: IShiftAssignmentRepository,
    private readonly shifts: IShiftRepository,
    private readonly records: IAttendanceRecordRepository,
    private readonly leave: IApprovedLeaveLookup,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async execute(employeeId: string): Promise<AttendanceRecord> {
    const now = this.clock();
    const { assignment, shift, workDate } = await resolvePunchContext(
      employeeId,
      now,
      this.assignments,
      this.shifts,
    );
    const window = shiftWindow(shift, workDate);
    assertInsideShiftWindow(now, shift, window);
    assertNotOnApprovedLeave(await this.leave.hasApprovedLeave(employeeId, workDate));
    assertNoExistingRecord(await this.records.findByEmployeeAndWorkDate(employeeId, workDate));
    return this.records.create({
      employeeId,
      shiftId: assignment.shiftId,
      workDate,
      checkedInAt: now,
      checkedOutAt: null,
      workedMinutes: null,
      lateMinutes: lateMinutes(shift, window, now),
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      status: "OPEN",
    });
  }
}

/**
 * Closes the open attendance record with server-time check-out.
 */
export class CheckOutUseCase {
  constructor(
    private readonly assignments: IShiftAssignmentRepository,
    private readonly shifts: IShiftRepository,
    private readonly records: IAttendanceRecordRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async execute(employeeId: string): Promise<AttendanceRecord> {
    const now = this.clock();
    const open = assertOpenRecord(await this.records.findOpenByEmployee(employeeId));
    const shift = await this.shifts.findById(open.shiftId);
    if (!shift) {
      throw new NotFoundError("Shift not found for open attendance");
    }
    const scheduled = shiftWindow(shift, open.workDate);
    const window = checkOutWindow(shift, open.workDate);
    assertInsideShiftWindow(now, shift, window);
    const worked = workedMinutes(open.checkedInAt, now);
    return this.records.update(open.id, {
      checkedOutAt: now,
      workedMinutes: worked,
      earlyLeaveMinutes: earlyLeaveMinutes(shift, scheduled, now),
      overtimeMinutes: overtimeMinutes(shift, worked),
      status: "CLOSED",
    });
  }
}
