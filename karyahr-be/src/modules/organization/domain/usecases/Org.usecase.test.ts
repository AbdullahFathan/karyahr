import { describe, expect, test } from "bun:test";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { Department, Position } from "../entities/Org";
import type { IDepartmentRepository, IPositionRepository } from "../repositories/IOrgRepository";
import {
  CreateDepartmentUseCase,
  CreatePositionUseCase,
  DeleteDepartmentUseCase,
  DeletePositionUseCase,
  ListDepartmentsUseCase,
  ListPositionsUseCase,
  UpdateDepartmentUseCase,
  UpdatePositionUseCase,
} from "./Org.usecase";

class MemoryDepartments implements IDepartmentRepository {
  constructor(
    private rows: Department[] = [],
    private employees = 0,
  ) {}
  async list(): Promise<readonly Department[]> {
    return this.rows;
  }
  async findById(id: string): Promise<Department | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByCode(code: string): Promise<Department | null> {
    return this.rows.find((row) => row.code === code) ?? null;
  }
  async create(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
  }): Promise<Department> {
    const row: Department = { id: `d${this.rows.length + 1}`, isActive: true, ...input };
    this.rows.push(row);
    return row;
  }
  async update(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Department> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return (await this.findById(id))!;
  }
  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.id !== id);
  }
  async childCount(id: string): Promise<number> {
    return this.rows.filter((row) => row.parentId === id).length;
  }
  async employeeCount(): Promise<number> {
    return this.employees;
  }
  async parentMap(): Promise<ReadonlyMap<string, string | null>> {
    return new Map(this.rows.map((row) => [row.id, row.parentId]));
  }
}

class MemoryPositions implements IPositionRepository {
  constructor(
    private rows: Position[] = [],
    private employees = 0,
  ) {}
  async list(): Promise<readonly Position[]> {
    return this.rows;
  }
  async findById(id: string): Promise<Position | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByCode(code: string): Promise<Position | null> {
    return this.rows.find((row) => row.code === code) ?? null;
  }
  async create(input: {
    readonly name: string;
    readonly code: string;
    readonly parentId: string | null;
    readonly departmentId: string | null;
  }): Promise<Position> {
    const row: Position = { id: `p${this.rows.length + 1}`, isActive: true, ...input };
    this.rows.push(row);
    return row;
  }
  async update(
    id: string,
    input: {
      readonly name?: string;
      readonly code?: string;
      readonly parentId?: string | null;
      readonly departmentId?: string | null;
      readonly isActive?: boolean;
    },
  ): Promise<Position> {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...input } : row));
    return (await this.findById(id))!;
  }
  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.id !== id);
  }
  async childCount(id: string): Promise<number> {
    return this.rows.filter((row) => row.parentId === id).length;
  }
  async employeeCount(): Promise<number> {
    return this.employees;
  }
  async parentMap(): Promise<ReadonlyMap<string, string | null>> {
    return new Map(this.rows.map((row) => [row.id, row.parentId]));
  }
}

describe("organization departments", () => {
  test("creates and lists departments", async () => {
    const departments = new MemoryDepartments();
    const created = await new CreateDepartmentUseCase(departments).execute({
      name: "HR",
      code: "HR",
      parentId: null,
    });
    expect(created.code).toBe("HR");
    expect(await new ListDepartmentsUseCase(departments).execute()).toHaveLength(1);
  });

  test("rejects duplicate codes and missing parents", async () => {
    const departments = new MemoryDepartments();
    await new CreateDepartmentUseCase(departments).execute({ name: "HR", code: "HR", parentId: null });
    await expect(
      new CreateDepartmentUseCase(departments).execute({ name: "X", code: "HR", parentId: null }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new CreateDepartmentUseCase(departments).execute({ name: "X", code: "X", parentId: "missing" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("rejects parent cycles and delete with children or employees", async () => {
    const departments = new MemoryDepartments();
    const parent = await new CreateDepartmentUseCase(departments).execute({
      name: "P",
      code: "P",
      parentId: null,
    });
    const child = await new CreateDepartmentUseCase(departments).execute({
      name: "C",
      code: "C",
      parentId: parent.id,
    });
    await expect(
      new UpdateDepartmentUseCase(departments).execute(parent.id, { parentId: child.id }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(new DeleteDepartmentUseCase(departments).execute(parent.id)).rejects.toBeInstanceOf(
      ValidationError,
    );
    const withEmployees = new MemoryDepartments(
      [{ id: "d1", name: "HR", code: "HR", parentId: null, isActive: true }],
      1,
    );
    await expect(new DeleteDepartmentUseCase(withEmployees).execute("d1")).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(new UpdateDepartmentUseCase(departments).execute("missing", { name: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("updates a department code", async () => {
    const departments = new MemoryDepartments();
    const created = await new CreateDepartmentUseCase(departments).execute({
      name: "HR",
      code: "HR",
      parentId: null,
    });
    const updated = await new UpdateDepartmentUseCase(departments).execute(created.id, { code: "HRO" });
    expect(updated.code).toBe("HRO");
  });
});

describe("organization positions", () => {
  test("creates a position under a department", async () => {
    const departments = new MemoryDepartments();
    const dept = await new CreateDepartmentUseCase(departments).execute({
      name: "HR",
      code: "HR",
      parentId: null,
    });
    const positions = new MemoryPositions();
    const created = await new CreatePositionUseCase(positions, departments).execute({
      name: "Staff",
      code: "STF",
      parentId: null,
      departmentId: dept.id,
    });
    expect(created.departmentId).toBe(dept.id);
    expect(await new ListPositionsUseCase(positions).execute()).toHaveLength(1);
  });

  test("rejects duplicate position codes and missing parents", async () => {
    const departments = new MemoryDepartments();
    const positions = new MemoryPositions();
    await new CreatePositionUseCase(positions, departments).execute({
      name: "A",
      code: "A",
      parentId: null,
      departmentId: null,
    });
    await expect(
      new CreatePositionUseCase(positions, departments).execute({
        name: "B",
        code: "A",
        parentId: null,
        departmentId: null,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new CreatePositionUseCase(positions, departments).execute({
        name: "B",
        code: "B",
        parentId: "missing",
        departmentId: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new CreatePositionUseCase(positions, departments).execute({
        name: "B",
        code: "B",
        parentId: null,
        departmentId: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("rejects position cycles and delete with children", async () => {
    const departments = new MemoryDepartments();
    const positions = new MemoryPositions();
    const parent = await new CreatePositionUseCase(positions, departments).execute({
      name: "P",
      code: "P",
      parentId: null,
      departmentId: null,
    });
    const child = await new CreatePositionUseCase(positions, departments).execute({
      name: "C",
      code: "C",
      parentId: parent.id,
      departmentId: null,
    });
    await expect(
      new UpdatePositionUseCase(positions, departments).execute(parent.id, { parentId: child.id }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(new DeletePositionUseCase(positions).execute(parent.id)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      new UpdatePositionUseCase(positions, departments).execute("missing", { name: "x" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
