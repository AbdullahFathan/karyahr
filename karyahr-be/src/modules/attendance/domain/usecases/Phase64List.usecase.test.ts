import { describe, expect, test } from "bun:test";
import { ValidationError } from "../../../../shared/errors/app-error";
import type { Department, OrgTreeEmployee, Position } from "../../../organization/domain/entities/Org";
import type {
  IDepartmentRepository,
  IOrgTreeReader,
  IPositionRepository,
} from "../../../organization/domain/repositories/IOrgRepository";
import { GetOrgTreeUseCase } from "../../../organization/domain/usecases/Org.usecase";
import type { AttendanceRecord } from "../entities/Attendance";
import type { IAttendanceRecordRepository } from "../repositories/IAttendanceRepository";
import { ExportAttendanceCsvUseCase } from "./AttendanceQuery.usecase";

class MemoryAttendanceRecords implements IAttendanceRecordRepository {
  async create(): Promise<AttendanceRecord> {
    throw new Error("unused");
  }
  async update(): Promise<AttendanceRecord> {
    throw new Error("unused");
  }
  async findOpen(): Promise<AttendanceRecord | null> {
    return null;
  }
  async findById(): Promise<AttendanceRecord | null> {
    return null;
  }
  async listByEmployee(): Promise<readonly AttendanceRecord[]> {
    return [];
  }
  async list(): Promise<readonly AttendanceRecord[]> {
    return [];
  }
  async listOnWorkDate(): Promise<readonly AttendanceRecord[]> {
    return [];
  }
}

describe("ExportAttendanceCsvUseCase", () => {
  test("rejects spans longer than 31 days", async () => {
    const useCase = new ExportAttendanceCsvUseCase(new MemoryAttendanceRecords());
    await expect(
      useCase.execute(new Date("2026-01-01T00:00:00.000Z"), new Date("2026-02-15T00:00:00.000Z")),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

class MemoryDepartments implements IDepartmentRepository {
  constructor(private readonly items: Department[]) {}
  async list() {
    return this.items;
  }
  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByCode() {
    return null;
  }
  async create(): Promise<Department> {
    throw new Error("unused");
  }
  async update(): Promise<Department> {
    throw new Error("unused");
  }
  async delete(): Promise<void> {}
  async childCount() {
    return 0;
  }
  async employeeCount() {
    return 0;
  }
  async parentMap() {
    return new Map(this.items.map((item) => [item.id, item.parentId]));
  }
}

class MemoryPositions implements IPositionRepository {
  constructor(private readonly items: Position[]) {}
  async list() {
    return this.items;
  }
  async findById() {
    return null;
  }
  async findByCode() {
    return null;
  }
  async create(): Promise<Position> {
    throw new Error("unused");
  }
  async update(): Promise<Position> {
    throw new Error("unused");
  }
  async delete(): Promise<void> {}
  async childCount() {
    return 0;
  }
  async employeeCount() {
    return 0;
  }
  async parentMap() {
    return new Map(this.items.map((item) => [item.id, item.parentId]));
  }
}

class MemoryTreeReader implements IOrgTreeReader {
  calls = 0;
  constructor(private readonly items: OrgTreeEmployee[]) {}
  async listEmployeesForTree(departmentIds?: readonly string[]) {
    this.calls += 1;
    if (!departmentIds) {
      return this.items;
    }
    return this.items.filter((item) => departmentIds.includes(item.departmentId));
  }
}

describe("GetOrgTreeUseCase", () => {
  const departments: Department[] = [
    {
      id: "dept-1",
      name: "HQ",
      code: "HQ",
      parentId: null,
      isActive: true,
    },
    {
      id: "dept-2",
      name: "Eng",
      code: "ENG",
      parentId: "dept-1",
      isActive: true,
    },
  ];
  const positions: Position[] = [
    {
      id: "pos-1",
      name: "Engineer",
      code: "ENG",
      parentId: null,
      departmentId: "dept-2",
      isActive: true,
    },
  ];
  const employees: OrgTreeEmployee[] = [
    {
      id: "emp-1",
      fullName: "Ada",
      departmentId: "dept-2",
      positionId: "pos-1",
      positionName: "Engineer",
    },
  ];

  test("omits employees when departmentId is not provided", async () => {
    const reader = new MemoryTreeReader(employees);
    const tree = await new GetOrgTreeUseCase(
      new MemoryDepartments(departments),
      new MemoryPositions(positions),
      reader,
    ).execute();
    expect(reader.calls).toBe(0);
    expect(tree[0]?.employees).toEqual([]);
    expect(tree[0]?.children[0]?.employees).toEqual([]);
  });

  test("includes employees for a department subtree", async () => {
    const reader = new MemoryTreeReader(employees);
    const tree = await new GetOrgTreeUseCase(
      new MemoryDepartments(departments),
      new MemoryPositions(positions),
      reader,
    ).execute("dept-2");
    expect(reader.calls).toBe(1);
    expect(tree[0]?.employees).toHaveLength(1);
    expect(tree[0]?.employees[0]?.fullName).toBe("Ada");
  });
});
