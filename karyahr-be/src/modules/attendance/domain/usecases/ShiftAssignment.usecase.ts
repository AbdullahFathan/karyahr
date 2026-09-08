import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { ShiftAssignment } from "../entities/Attendance";
import { addWorkDays } from "../jakarta-time";
import type {
  IShiftAssignmentRepository,
  IShiftRepository,
} from "../repositories/IAttendanceRepository";

/**
 * Assigns a shift to an employee and closes any open assignment the day before.
 */
export class AssignShiftUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly shifts: IShiftRepository,
    private readonly assignments: IShiftAssignmentRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    input: { readonly employeeId: string; readonly shiftId: string; readonly effectiveFrom: Date },
    actorUserId: string,
  ): Promise<ShiftAssignment> {
    const employee = await this.employees.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    const shift = await this.shifts.findById(input.shiftId);
    if (!shift || !shift.isActive) {
      throw new NotFoundError("Shift not found");
    }
    const open = await this.assignments.findOpenByEmployee(input.employeeId);
    if (open) {
      if (open.effectiveFrom.getTime() >= input.effectiveFrom.getTime()) {
        throw new ConflictError("Open assignment starts on or after the new effective date");
      }
      await this.assignments.closeOpen(open.id, addWorkDays(input.effectiveFrom, -1));
    }
    const assignment = await this.assignments.create({
      employeeId: input.employeeId,
      shiftId: input.shiftId,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: null,
    });
    await this.audit.append({
      actorUserId,
      entityType: "ShiftAssignment",
      entityId: assignment.id,
      action: "create",
      metadata: { employeeId: input.employeeId, shiftId: input.shiftId },
    });
    return assignment;
  }
}

/**
 * Lists shift assignments for an employee.
 */
export class ListShiftAssignmentsUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly assignments: IShiftAssignmentRepository,
  ) {}

  async execute(employeeId: string): Promise<readonly ShiftAssignment[]> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    return this.assignments.listByEmployee(employeeId);
  }
}
