import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { Shift } from "../entities/Attendance";
import type { IShiftRepository } from "../repositories/IAttendanceRepository";
import { CreateShiftUseCase, GetShiftByIdUseCase, ListShiftsUseCase, UpdateShiftUseCase } from "./Shift.usecase";

class MemoryShifts implements IShiftRepository {
  constructor(private rows: Shift[] = []) {}
  async create(input: Omit<Shift, "id">): Promise<Shift> {
    const shift: Shift = { id: `s${this.rows.length + 1}`, ...input };
    this.rows.push(shift);
    return shift;
  }
  async update(id: string, input: Partial<Omit<Shift, "id">>): Promise<Shift> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return (await this.findById(id))!;
  }
  async findById(id: string): Promise<Shift | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByCode(code: string): Promise<Shift | null> {
    return this.rows.find((row) => row.code === code) ?? null;
  }
  async list(): Promise<readonly Shift[]> {
    return this.rows;
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };

const base = {
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

describe("Shift use cases", () => {
  test("creates, lists, and loads a shift", async () => {
    const shifts = new MemoryShifts();
    const created = await new CreateShiftUseCase(shifts, audit).execute(base, "u1");
    expect(created.code).toBe("PAGI");
    expect(await new ListShiftsUseCase(shifts).execute()).toHaveLength(1);
    expect((await new GetShiftByIdUseCase(shifts).execute(created.id)).name).toBe("Pagi");
  });

  test("rejects invalid minutes and duplicate codes", async () => {
    const shifts = new MemoryShifts();
    await expect(
      new CreateShiftUseCase(shifts, audit).execute({ ...base, startMinutes: 2000 }, "u1"),
    ).rejects.toBeInstanceOf(ValidationError);
    await new CreateShiftUseCase(shifts, audit).execute(base, "u1");
    await expect(new CreateShiftUseCase(shifts, audit).execute(base, "u1")).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  test("updates a shift and rejects conflicts", async () => {
    const shifts = new MemoryShifts();
    const first = await new CreateShiftUseCase(shifts, audit).execute(base, "u1");
    await new CreateShiftUseCase(shifts, audit).execute({ ...base, code: "SIANG", name: "Siang" }, "u1");
    const updated = await new UpdateShiftUseCase(shifts, audit).execute(
      first.id,
      { endMinutes: 1080 },
      "u1",
    );
    expect(updated.endMinutes).toBe(1080);
    await expect(
      new UpdateShiftUseCase(shifts, audit).execute(first.id, { code: "SIANG" }, "u1"),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new UpdateShiftUseCase(shifts, audit).execute("missing", { name: "x" }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(new GetShiftByIdUseCase(shifts).execute("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
