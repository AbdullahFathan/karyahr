import type { AttendanceRecord, Shift, ShiftAssignment } from "../entities/Attendance";

export type CreateShiftInput = Omit<Shift, "id">;
export type UpdateShiftInput = Partial<Omit<Shift, "id" | "code">> & { readonly code?: string };

export type IShiftRepository = {
  create(input: CreateShiftInput): Promise<Shift>;
  update(id: string, input: UpdateShiftInput): Promise<Shift>;
  findById(id: string): Promise<Shift | null>;
  findByCode(code: string): Promise<Shift | null>;
  list(): Promise<readonly Shift[]>;
};

export type CreateAssignmentInput = Omit<ShiftAssignment, "id">;

export type IShiftAssignmentRepository = {
  create(input: CreateAssignmentInput): Promise<ShiftAssignment>;
  findOpenByEmployee(employeeId: string): Promise<ShiftAssignment | null>;
  closeOpen(id: string, effectiveTo: Date): Promise<void>;
  findActiveOnDate(employeeId: string, workDate: Date): Promise<ShiftAssignment | null>;
  listByEmployee(employeeId: string): Promise<readonly ShiftAssignment[]>;
};

export type CreateAttendanceInput = Omit<AttendanceRecord, "id">;

export type AttendanceListFilter = {
  readonly employeeIds?: readonly string[];
  readonly from: Date;
  readonly to: Date;
};

export type IAttendanceRecordRepository = {
  create(input: CreateAttendanceInput): Promise<AttendanceRecord>;
  update(id: string, input: Partial<Omit<AttendanceRecord, "id" | "employeeId" | "workDate">>): Promise<AttendanceRecord>;
  findByEmployeeAndWorkDate(employeeId: string, workDate: Date): Promise<AttendanceRecord | null>;
  findOpenByEmployee(employeeId: string): Promise<AttendanceRecord | null>;
  listByEmployee(employeeId: string, from: Date, to: Date): Promise<readonly AttendanceRecord[]>;
  list(filter: AttendanceListFilter): Promise<readonly AttendanceRecord[]>;
  listOnWorkDate(workDate: Date, employeeIds: readonly string[]): Promise<readonly AttendanceRecord[]>;
};
