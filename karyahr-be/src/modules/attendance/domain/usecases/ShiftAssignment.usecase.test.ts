import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { Shift, ShiftAssignment } from "../entities/Attendance";
import type { IShiftAssignmentRepository, IShiftRepository } from "../repositories/IAttendanceRepository";
import { AssignShiftUseCase, ListShiftAssignmentsUseCase } from "./ShiftAssignment.usecase";

const employee: Employee = {
  id: "e1",
  fullName: "Siti",
  nationalId: "1",
  birthDate: new Date("1995-01-01"),
  address: "Jakarta",
  phone: "081",
  emergencyContact: "082",
  employeeNumber: "EMP-1",
  departmentId: "d1",
  positionId: "p1",
  managerId: null,
  joinedAt: new Date("2024-01-01"),
  status: "ACTIVE",
  contractType: "PERMANENT",
};

const shift: Shift = {
  id: "s1",
  name: "Pagi",
  code: "PAGI",
  startMinutes: 480,
  endMinutes: 1020,
  graceMinutesLate: 15,
  graceMinutesEarly: 15,
  overtimeCapMinutes: 120,
  isFlexible: false,
  isActive: true,
};

class MemoryEmployees implements IEmployeeRepository {
  constructor(private readonly item: Employee | null) {}
  async create(): Promise<Employee> {
    throw new Error("unused");
  }
  async update(): Promise<Employee> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<Employee | null> {
    return this.item && this.item.id === id ? this.item : null;
  }
  async findByIds(): Promise<readonly Employee[]> {
    return this.item ? [this.item] : [];
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list() {
    return { items: [], total: 0 };
  }
  async listDirectory() {
    return { items: [], total: 0 };
  }
}

class MemoryShifts implements IShiftRepository {
  constructor(private readonly item: Shift | null) {}
  async create(): Promise<Shift> {
    throw new Error("unused");
  }
  async update(): Promise<Shift> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<Shift | null> {
    return this.item && this.item.id === id ? this.item : null;
  }
  async findByCode(): Promise<Shift | null> {
    return this.item;
  }
  async list(): Promise<readonly Shift[]> {
    return this.item ? [this.item] : [];
  }
}

class MemoryAssignments implements IShiftAssignmentRepository {
  rows: ShiftAssignment[] = [];
  async create(input: Omit<ShiftAssignment, "id">): Promise<ShiftAssignment> {
    const row: ShiftAssignment = { id: `a${this.rows.length + 1}`, ...input };
    this.rows.push(row);
    return row;
  }
  async findOpenByEmployee(employeeId: string): Promise<ShiftAssignment | null> {
    return this.rows.find((row) => row.employeeId === employeeId && row.effectiveTo === null) ?? null;
  }
  async closeOpen(id: string, effectiveTo: Date): Promise<void> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, effectiveTo } : row));
  }
  async findActiveOnDate(): Promise<ShiftAssignment | null> {
    return this.rows[0] ?? null;
  }
  async listByEmployee(employeeId: string): Promise<readonly ShiftAssignment[]> {
    return this.rows.filter((row) => row.employeeId === employeeId);
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };

describe("AssignShiftUseCase", () => {
  test("assigns a shift and closes the previous open assignment", async () => {
    const assignments = new MemoryAssignments();
    const useCase = new AssignShiftUseCase(
      new MemoryEmployees(employee),
      new MemoryShifts(shift),
      assignments,
      audit,
    );
    await useCase.execute(
      { employeeId: "e1", shiftId: "s1", effectiveFrom: new Date("2026-01-01") },
      "u1",
    );
    const second = await useCase.execute(
      { employeeId: "e1", shiftId: "s1", effectiveFrom: new Date("2026-02-01") },
      "u1",
    );
    expect(second.effectiveFrom.toISOString()).toContain("2026-02-01");
    expect(assignments.rows[0]?.effectiveTo).not.toBeNull();
    expect(
      await new ListShiftAssignmentsUseCase(new MemoryEmployees(employee), assignments).execute("e1"),
    ).toHaveLength(2);
  });

  test("rejects overlapping open assignments and missing records", async () => {
    const assignments = new MemoryAssignments();
    const useCase = new AssignShiftUseCase(
      new MemoryEmployees(employee),
      new MemoryShifts(shift),
      assignments,
      audit,
    );
    await useCase.execute(
      { employeeId: "e1", shiftId: "s1", effectiveFrom: new Date("2026-02-01") },
      "u1",
    );
    await expect(
      useCase.execute(
        { employeeId: "e1", shiftId: "s1", effectiveFrom: new Date("2026-01-15") },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new AssignShiftUseCase(
        new MemoryEmployees(null),
        new MemoryShifts(shift),
        assignments,
        audit,
      ).execute({ employeeId: "e1", shiftId: "s1", effectiveFrom: new Date() }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new AssignShiftUseCase(
        new MemoryEmployees(employee),
        new MemoryShifts({ ...shift, isActive: false }),
        assignments,
        audit,
      ).execute({ employeeId: "e1", shiftId: "s1", effectiveFrom: new Date("2026-03-01") }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new ListShiftAssignmentsUseCase(new MemoryEmployees(null), assignments).execute("e1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
