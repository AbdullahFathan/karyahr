import { describe, expect, test } from "bun:test";
import { ConflictError, ValidationError } from "../../../../shared/errors/app-error";
import type { AttendanceRecord, Shift, ShiftAssignment } from "../entities/Attendance";
import { jakartaDateToWorkDate } from "../jakarta-time";
import type { IApprovedLeaveLookup } from "../ports/IApprovedLeaveLookup";
import type {
  IAttendanceRecordRepository,
  IShiftAssignmentRepository,
  IShiftRepository,
} from "../repositories/IAttendanceRepository";
import { CheckInUseCase, CheckOutUseCase } from "./Punch.usecase";

const pagi: Shift = {
  id: "s-pagi",
  name: "Pagi",
  code: "PAGI",
  startMinutes: 8 * 60,
  endMinutes: 17 * 60,
  graceMinutesLate: 15,
  graceMinutesEarly: 0,
  isFlexible: false,
  isActive: true,
};

const malam: Shift = {
  id: "s-malam",
  name: "Malam",
  code: "MALAM",
  startMinutes: 22 * 60,
  endMinutes: 6 * 60,
  graceMinutesLate: 0,
  graceMinutesEarly: 0,
  isFlexible: false,
  isActive: true,
};

const assignment: ShiftAssignment = {
  id: "a1",
  employeeId: "e1",
  shiftId: pagi.id,
  effectiveFrom: jakartaDateToWorkDate(2026, 1, 1),
  effectiveTo: null,
};

class MemoryShifts implements IShiftRepository {
  constructor(private readonly items: Shift[]) {}
  async create(): Promise<Shift> {
    return this.items[0]!;
  }
  async update(): Promise<Shift> {
    return this.items[0]!;
  }
  async findById(id: string): Promise<Shift | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByCode(): Promise<Shift | null> {
    return this.items[0] ?? null;
  }
  async list(): Promise<readonly Shift[]> {
    return this.items;
  }
}

class MemoryAssignments implements IShiftAssignmentRepository {
  constructor(private readonly row: ShiftAssignment | null) {}
  async create(): Promise<ShiftAssignment> {
    return this.row!;
  }
  async findOpenByEmployee(): Promise<ShiftAssignment | null> {
    return this.row;
  }
  async closeOpen(): Promise<void> {}
  async findActiveOnDate(): Promise<ShiftAssignment | null> {
    return this.row;
  }
  async listByEmployee(): Promise<readonly ShiftAssignment[]> {
    return this.row ? [this.row] : [];
  }
}

class MemoryRecords implements IAttendanceRecordRepository {
  rows: AttendanceRecord[] = [];
  async create(input: Omit<AttendanceRecord, "id">): Promise<AttendanceRecord> {
    const row: AttendanceRecord = { ...input, id: `r${this.rows.length + 1}` };
    this.rows.push(row);
    return row;
  }
  async update(id: string, input: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return this.rows.find((row) => row.id === id)!;
  }
  async findByEmployeeAndWorkDate(
    employeeId: string,
    workDate: Date,
  ): Promise<AttendanceRecord | null> {
    return (
      this.rows.find(
        (row) => row.employeeId === employeeId && row.workDate.getTime() === workDate.getTime(),
      ) ?? null
    );
  }
  async findOpenByEmployee(employeeId: string): Promise<AttendanceRecord | null> {
    return this.rows.find((row) => row.employeeId === employeeId && row.status === "OPEN") ?? null;
  }
  async listByEmployee(): Promise<readonly AttendanceRecord[]> {
    return this.rows;
  }
  async list(): Promise<readonly AttendanceRecord[]> {
    return this.rows;
  }
  async listOnWorkDate(): Promise<readonly AttendanceRecord[]> {
    return this.rows;
  }
}

class MemoryLeave implements IApprovedLeaveLookup {
  constructor(private readonly blocked: boolean) {}
  async hasApprovedLeave(): Promise<boolean> {
    return this.blocked;
  }
  async listEmployeeIdsOnLeave(): Promise<readonly string[]> {
    return [];
  }
}

function clockAt(iso: string): () => Date {
  return () => new Date(iso);
}

describe("CheckInUseCase", () => {
  test("opens a record with late minutes after grace", async () => {
    const records = new MemoryRecords();
    const result = await new CheckInUseCase(
      new MemoryAssignments({ ...assignment, shiftId: pagi.id }),
      new MemoryShifts([pagi]),
      records,
      new MemoryLeave(false),
      clockAt("2026-09-08T01:20:00.000Z"),
    ).execute("e1");
    expect(result.status).toBe("OPEN");
    expect(result.lateMinutes).toBe(5);
  });

  test("rejects a second check-in on the same work date", async () => {
    const records = new MemoryRecords();
    const useCase = new CheckInUseCase(
      new MemoryAssignments(assignment),
      new MemoryShifts([pagi]),
      records,
      new MemoryLeave(false),
      clockAt("2026-09-08T01:00:00.000Z"),
    );
    await useCase.execute("e1");
    expect(useCase.execute("e1")).rejects.toBeInstanceOf(ConflictError);
  });

  test("rejects check-in outside the shift window", async () => {
    const useCase = new CheckInUseCase(
      new MemoryAssignments(assignment),
      new MemoryShifts([pagi]),
      new MemoryRecords(),
      new MemoryLeave(false),
      clockAt("2026-09-08T00:00:00.000Z"),
    );
    expect(useCase.execute("e1")).rejects.toBeInstanceOf(ValidationError);
  });

  test("rejects check-in during approved leave", async () => {
    const useCase = new CheckInUseCase(
      new MemoryAssignments(assignment),
      new MemoryShifts([pagi]),
      new MemoryRecords(),
      new MemoryLeave(true),
      clockAt("2026-09-08T01:00:00.000Z"),
    );
    expect(useCase.execute("e1")).rejects.toBeInstanceOf(ConflictError);
  });

  test("uses yesterday as work date for an overnight shift after midnight", async () => {
    const records = new MemoryRecords();
    const nightAssignment = { ...assignment, shiftId: malam.id };
    const result = await new CheckInUseCase(
      new MemoryAssignments(nightAssignment),
      new MemoryShifts([malam]),
      records,
      new MemoryLeave(false),
      clockAt("2026-09-08T18:00:00.000Z"),
    ).execute("e1");
    expect(result.workDate.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    expect(result.shiftId).toBe(malam.id);
  });
});

describe("CheckOutUseCase", () => {
  test("rejects check-out without an open record", async () => {
    const useCase = new CheckOutUseCase(
      new MemoryAssignments(assignment),
      new MemoryShifts([pagi]),
      new MemoryRecords(),
      clockAt("2026-09-08T10:00:00.000Z"),
    );
    expect(useCase.execute("e1")).rejects.toBeInstanceOf(ValidationError);
  });

  test("closes the open record and counts early leave", async () => {
    const records = new MemoryRecords();
    await new CheckInUseCase(
      new MemoryAssignments(assignment),
      new MemoryShifts([pagi]),
      records,
      new MemoryLeave(false),
      clockAt("2026-09-08T01:00:00.000Z"),
    ).execute("e1");
    const closed = await new CheckOutUseCase(
      new MemoryAssignments(assignment),
      new MemoryShifts([pagi]),
      records,
      clockAt("2026-09-08T09:00:00.000Z"),
    ).execute("e1");
    expect(closed.status).toBe("CLOSED");
    expect(closed.earlyLeaveMinutes).toBe(60);
    expect(closed.workedMinutes).toBe(8 * 60);
  });
});
