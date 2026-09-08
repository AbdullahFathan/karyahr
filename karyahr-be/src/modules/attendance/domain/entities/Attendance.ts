export const ATTENDANCE_RECORD_STATUSES = ["OPEN", "CLOSED"] as const;
export type AttendanceRecordStatus = (typeof ATTENDANCE_RECORD_STATUSES)[number];

export type Shift = {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly startMinutes: number;
  readonly endMinutes: number;
  readonly graceMinutesLate: number;
  readonly graceMinutesEarly: number;
  readonly isFlexible: boolean;
  readonly isActive: boolean;
};

export type ShiftAssignment = {
  readonly id: string;
  readonly employeeId: string;
  readonly shiftId: string;
  readonly effectiveFrom: Date;
  readonly effectiveTo: Date | null;
};

export type AttendanceRecord = {
  readonly id: string;
  readonly employeeId: string;
  readonly shiftId: string;
  readonly workDate: Date;
  readonly checkedInAt: Date;
  readonly checkedOutAt: Date | null;
  readonly workedMinutes: number | null;
  readonly lateMinutes: number;
  readonly earlyLeaveMinutes: number;
  readonly status: AttendanceRecordStatus;
};
