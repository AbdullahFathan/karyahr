import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type { AttendanceRecord, Shift, ShiftAssignment } from "../domain/entities/Attendance";
import type {
  AttendanceListFilter,
  CreateAssignmentInput,
  CreateAttendanceInput,
  CreateShiftInput,
  IAttendanceRecordRepository,
  IShiftAssignmentRepository,
  IShiftRepository,
  UpdateShiftInput,
} from "../domain/repositories/IAttendanceRepository";

function toShift(row: Shift): Shift {
  return row;
}

function toAssignment(row: ShiftAssignment): ShiftAssignment {
  return row;
}

function toRecord(row: AttendanceRecord): AttendanceRecord {
  return row;
}

/**
 * Shift persistence with Prisma.
 */
export class PrismaShiftRepository implements IShiftRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateShiftInput): Promise<Shift> {
    return toShift(await this.prisma.shift.create({ data: input }));
  }

  async update(id: string, input: UpdateShiftInput): Promise<Shift> {
    return toShift(await this.prisma.shift.update({ where: { id }, data: input }));
  }

  async findById(id: string): Promise<Shift | null> {
    const row = await this.prisma.shift.findUnique({ where: { id } });
    return row ? toShift(row) : null;
  }

  async findByCode(code: string): Promise<Shift | null> {
    const row = await this.prisma.shift.findUnique({ where: { code } });
    return row ? toShift(row) : null;
  }

  async list(): Promise<readonly Shift[]> {
    const rows = await this.prisma.shift.findMany({ orderBy: { name: "asc" } });
    return rows.map(toShift);
  }
}

/**
 * Shift assignment persistence with Prisma.
 */
export class PrismaShiftAssignmentRepository implements IShiftAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAssignmentInput): Promise<ShiftAssignment> {
    return toAssignment(await this.prisma.shiftAssignment.create({ data: input }));
  }

  async findOpenByEmployee(employeeId: string): Promise<ShiftAssignment | null> {
    const row = await this.prisma.shiftAssignment.findFirst({
      where: { employeeId, effectiveTo: null },
    });
    return row ? toAssignment(row) : null;
  }

  async closeOpen(id: string, effectiveTo: Date): Promise<void> {
    await this.prisma.shiftAssignment.update({ where: { id }, data: { effectiveTo } });
  }

  async findActiveOnDate(employeeId: string, workDate: Date): Promise<ShiftAssignment | null> {
    const row = await this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: workDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: workDate } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    return row ? toAssignment(row) : null;
  }

  async listByEmployee(employeeId: string): Promise<readonly ShiftAssignment[]> {
    const rows = await this.prisma.shiftAssignment.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: "desc" },
    });
    return rows.map(toAssignment);
  }
}

/**
 * Attendance record persistence with Prisma.
 */
export class PrismaAttendanceRecordRepository implements IAttendanceRecordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAttendanceInput): Promise<AttendanceRecord> {
    return toRecord(await this.prisma.attendanceRecord.create({ data: input }));
  }

  async update(
    id: string,
    input: Partial<Omit<AttendanceRecord, "id" | "employeeId" | "workDate">>,
  ): Promise<AttendanceRecord> {
    return toRecord(await this.prisma.attendanceRecord.update({ where: { id }, data: input }));
  }

  async findByEmployeeAndWorkDate(
    employeeId: string,
    workDate: Date,
  ): Promise<AttendanceRecord | null> {
    const row = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_workDate: { employeeId, workDate } },
    });
    return row ? toRecord(row) : null;
  }

  async findOpenByEmployee(employeeId: string): Promise<AttendanceRecord | null> {
    const row = await this.prisma.attendanceRecord.findFirst({
      where: { employeeId, status: "OPEN" },
    });
    return row ? toRecord(row) : null;
  }

  async listByEmployee(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<readonly AttendanceRecord[]> {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { employeeId, workDate: { gte: from, lte: to } },
      orderBy: { workDate: "asc" },
    });
    return rows.map(toRecord);
  }

  async list(filter: AttendanceListFilter): Promise<readonly AttendanceRecord[]> {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        workDate: { gte: filter.from, lte: filter.to },
        employeeId: filter.employeeIds ? { in: [...filter.employeeIds] } : undefined,
      },
      orderBy: [{ workDate: "asc" }, { employeeId: "asc" }],
    });
    return rows.map(toRecord);
  }

  async listOnWorkDate(
    workDate: Date,
    employeeIds: readonly string[],
  ): Promise<readonly AttendanceRecord[]> {
    if (employeeIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { workDate, employeeId: { in: [...employeeIds] } },
    });
    return rows.map(toRecord);
  }
}
