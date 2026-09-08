import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { Shift } from "../entities/Attendance";
import type {
  CreateShiftInput,
  IShiftRepository,
  UpdateShiftInput,
} from "../repositories/IAttendanceRepository";

function assertMinutes(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 1439) {
    throw new ValidationError(`${name} must be an integer between 0 and 1439`);
  }
}

/**
 * Creates a shift definition.
 */
export class CreateShiftUseCase {
  constructor(
    private readonly shifts: IShiftRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: CreateShiftInput, actorUserId: string): Promise<Shift> {
    assertMinutes(input.startMinutes, "startMinutes");
    assertMinutes(input.endMinutes, "endMinutes");
    const existing = await this.shifts.findByCode(input.code);
    if (existing) {
      throw new ConflictError("Shift code already exists");
    }
    const shift = await this.shifts.create(input);
    await this.audit.append({
      actorUserId,
      entityType: "Shift",
      entityId: shift.id,
      action: "create",
    });
    return shift;
  }
}

/**
 * Updates a shift definition.
 */
export class UpdateShiftUseCase {
  constructor(
    private readonly shifts: IShiftRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(id: string, input: UpdateShiftInput, actorUserId: string): Promise<Shift> {
    const shift = await this.shifts.findById(id);
    if (!shift) {
      throw new NotFoundError("Shift not found");
    }
    if (input.startMinutes !== undefined) {
      assertMinutes(input.startMinutes, "startMinutes");
    }
    if (input.endMinutes !== undefined) {
      assertMinutes(input.endMinutes, "endMinutes");
    }
    if (input.code && input.code !== shift.code) {
      const existing = await this.shifts.findByCode(input.code);
      if (existing) {
        throw new ConflictError("Shift code already exists");
      }
    }
    const updated = await this.shifts.update(id, input);
    await this.audit.append({
      actorUserId,
      entityType: "Shift",
      entityId: id,
      action: "update",
    });
    return updated;
  }
}

/**
 * Lists all shifts.
 */
export class ListShiftsUseCase {
  constructor(private readonly shifts: IShiftRepository) {}

  execute(): Promise<readonly Shift[]> {
    return this.shifts.list();
  }
}

/**
 * Loads one shift.
 */
export class GetShiftByIdUseCase {
  constructor(private readonly shifts: IShiftRepository) {}

  async execute(id: string): Promise<Shift> {
    const shift = await this.shifts.findById(id);
    if (!shift) {
      throw new NotFoundError("Shift not found");
    }
    return shift;
  }
}
