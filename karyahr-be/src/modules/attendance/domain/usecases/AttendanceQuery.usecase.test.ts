import { describe, expect, test } from "bun:test";
import { ForbiddenError } from "../../../../shared/errors/app-error";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { AttendanceRecord } from "../entities/Attendance";
import type { IApprovedLeaveLookup } from "../ports/IApprovedLeaveLookup";
import type { IAttendanceRecordRepository } from "../repositories/IAttendanceRepository";
import {
  GetAttendanceDashboardUseCase,
  GetAttendanceSummaryUseCase,
  ListMyAttendanceUseCase,
} from "./AttendanceQuery.usecase";

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
  managerId: "m1",
  joinedAt: new Date("2024-01-01"),
  status: "ACTIVE",
  contractType: "PERMANENT",
};

const report: Employee = { ...employee, id: "e2", employeeNumber: "EMP-2", fullName: "Budi" };
const outsider: Employee = {
  ...employee,
  id: "e3",
  employeeNumber: "EMP-3",
  managerId: "other",
  fullName: "Other",
};

function record(overrides: Partial<AttendanceRecord>): AttendanceRecord {
  return {
    id: "a1",
    employeeId: "e1",
    shiftId: "s1",
    workDate: new Date("2026-09-09T00:00:00.000Z"),
    checkedInAt: new Date("2026-09-09T01:00:00.000Z"),
    checkedOutAt: new Date("2026-09-09T10:00:00.000Z"),
    workedMinutes: 540,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
    status: "CLOSED",
    ...overrides,
  };
}

class MemoryEmployees implements IEmployeeRepository {
  constructor(private readonly items: Employee[]) {}
  async create(): Promise<Employee> {
    return this.items[0]!;
  }
  async update(): Promise<Employee> {
    return this.items[0]!;
  }
  async findById(id: string): Promise<Employee | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByIds(ids: readonly string[]): Promise<readonly Employee[]> {
    return this.items.filter((item) => ids.includes(item.id));
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list() {
    return { items: this.items, total: this.items.length };
  }
  async listDirectory(filter: { managerId?: string }) {
    const items = this.items.filter((item) =>
      filter.managerId ? item.managerId === filter.managerId : true,
    );
    return { items, total: items.length };
  }
}

class MemoryRecords implements IAttendanceRecordRepository {
  constructor(private readonly rows: AttendanceRecord[]) {}
  async create(): Promise<AttendanceRecord> {
    throw new Error("unused");
  }
  async update(): Promise<AttendanceRecord> {
    throw new Error("unused");
  }
  async findByEmployeeAndWorkDate(): Promise<AttendanceRecord | null> {
    return null;
  }
  async findOpenByEmployee(): Promise<AttendanceRecord | null> {
    return null;
  }
  async listByEmployee(employeeId: string): Promise<readonly AttendanceRecord[]> {
    return this.rows.filter((row) => row.employeeId === employeeId);
  }
  async list(): Promise<readonly AttendanceRecord[]> {
    return this.rows;
  }
  async listOnWorkDate(_workDate: Date, employeeIds: readonly string[]): Promise<readonly AttendanceRecord[]> {
    return this.rows.filter((row) => employeeIds.includes(row.employeeId));
  }
}

class MemoryLeave implements IApprovedLeaveLookup {
  constructor(private readonly ids: readonly string[] = []) {}
  async hasApprovedLeave(): Promise<boolean> {
    return false;
  }
  async listEmployeeIdsOnLeave(): Promise<readonly string[]> {
    return this.ids;
  }
}

const clock = () => new Date("2026-09-09T10:00:00.000Z");

describe("attendance queries", () => {
  test("lists my attendance", async () => {
    const rows = [record({})];
    const listed = await new ListMyAttendanceUseCase(new MemoryRecords(rows)).execute(
      "e1",
      new Date("2026-09-01"),
      new Date("2026-09-30"),
    );
    expect(listed).toHaveLength(1);
  });

  test("summarizes self, reports, and forbids outsiders", async () => {
    const useCase = new GetAttendanceSummaryUseCase(
      new MemoryEmployees([employee, report, outsider]),
      new MemoryRecords([record({ lateMinutes: 10 }), record({ id: "a2", earlyLeaveMinutes: 5 })]),
      clock,
    );
    const self = await useCase.execute(
      { actorEmployeeId: "e1", isHr: false, isManager: false },
      { period: "month" },
    );
    expect(self.presentDays).toBe(2);
    expect(self.lateDays).toBe(1);
    const managerView = await useCase.execute(
      { actorEmployeeId: "m1", isHr: false, isManager: true },
      { employeeId: "e1", period: "week" },
    );
    expect(managerView.presentDays).toBe(2);
    await expect(
      useCase.execute(
        { actorEmployeeId: "m1", isHr: false, isManager: true },
        { employeeId: "e3", period: "day" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      useCase.execute(
        { actorEmployeeId: "e1", isHr: false, isManager: false },
        { employeeId: "e2", period: "day" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("builds dashboard buckets", async () => {
    const useCase = new GetAttendanceDashboardUseCase(
      new MemoryEmployees([employee, report, outsider]),
      new MemoryRecords([
        record({ employeeId: "e1" }),
        record({ id: "a2", employeeId: "e2", lateMinutes: 12 }),
      ]),
      new MemoryLeave(["e3"]),
      clock,
    );
    const dashboard = await useCase.execute(
      { actorEmployeeId: "hr", isHr: true, isManager: false },
      { pagination: { page: 1, pageSize: 20, skip: 0, take: 20 } },
    );
    expect(dashboard.present.map((row) => row.employeeId)).toEqual(["e1"]);
    expect(dashboard.late.map((row) => row.employeeId)).toEqual(["e2"]);
    expect(dashboard.onLeave.map((row) => row.employeeId)).toEqual(["e3"]);
    await expect(
      useCase.execute(
        { actorEmployeeId: "e1", isHr: false, isManager: false },
        { pagination: { page: 1, pageSize: 20, skip: 0, take: 20 } },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
