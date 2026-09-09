import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error";
import type { AuthUser } from "../../../auth/domain/entities/AuthUser";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { Employee } from "../entities/Employee";
import type {
  CreateEmployeeInput,
  IEmployeeRepository,
  UpdateEmployeeInput,
} from "../repositories/IEmployeeRepository";
import {
  CreateEmployeeUseCase,
  GetEmployeeByIdUseCase,
  ListEmployeesUseCase,
  UpdateEmployeeUseCase,
} from "./EmployeeCrud.usecase";

function sample(overrides: Partial<Employee> = {}): Employee {
  return {
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
    ...overrides,
  };
}

class MemoryEmployees implements IEmployeeRepository {
  constructor(private items: Employee[] = []) {}
  async create(input: CreateEmployeeInput): Promise<Employee> {
    const employee = { id: `e${this.items.length + 1}`, ...input };
    this.items.push(employee);
    return employee;
  }
  async update(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    this.items = this.items.map((item) => (item.id === id ? { ...item, ...input } : item));
    return this.items.find((item) => item.id === id)!;
  }
  async findById(id: string): Promise<Employee | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByIds(ids: readonly string[]): Promise<readonly Employee[]> {
    return this.items.filter((item) => ids.includes(item.id));
  }
  async findByNationalId(nationalId: string): Promise<Employee | null> {
    return this.items.find((item) => item.nationalId === nationalId) ?? null;
  }
  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.items.find((item) => item.employeeNumber === employeeNumber) ?? null;
  }
  async list() {
    return { items: this.items, total: this.items.length };
  }
  async listDirectory() {
    return { items: this.items, total: this.items.length };
  }
}

class MemoryUsers implements IUserRepository {
  active = true;
  async findByEmail(): Promise<AuthUser | null> {
    return null;
  }
  async findById(): Promise<AuthUser | null> {
    return null;
  }
  async findByEmployeeId(): Promise<AuthUser | null> {
    return null;
  }
  async listByRoleName(): Promise<readonly AuthUser[]> {
    return [];
  }
  async setActiveByEmployeeId(_employeeId: string, isActive: boolean): Promise<void> {
    this.active = isActive;
  }
  async create(): Promise<AuthUser> {
    throw new Error("unused");
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };

const createInput: CreateEmployeeInput = {
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

describe("Employee CRUD", () => {
  test("creates an employee", async () => {
    const employees = new MemoryEmployees();
    const created = await new CreateEmployeeUseCase(employees, audit).execute(createInput, "u1");
    expect(created.employeeNumber).toBe("EMP-1");
  });

  test("rejects duplicate national id and employee number", async () => {
    const employees = new MemoryEmployees([sample()]);
    await expect(
      new CreateEmployeeUseCase(employees, audit).execute(createInput, "u1"),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new CreateEmployeeUseCase(employees, audit).execute(
        { ...createInput, nationalId: "99", employeeNumber: "EMP-1" },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("rejects a missing manager on create", async () => {
    const employees = new MemoryEmployees();
    await expect(
      new CreateEmployeeUseCase(employees, audit).execute({ ...createInput, managerId: "m-missing" }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("updates an employee and deactivates the user", async () => {
    const employees = new MemoryEmployees([sample()]);
    const users = new MemoryUsers();
    const updated = await new UpdateEmployeeUseCase(employees, users, audit).execute(
      "e1",
      { status: "INACTIVE" },
      "u1",
    );
    expect(updated.status).toBe("INACTIVE");
    expect(users.active).toBe(false);
  });

  test("rejects update conflicts and missing manager", async () => {
    const employees = new MemoryEmployees([
      sample(),
      sample({ id: "e2", nationalId: "2", employeeNumber: "EMP-2" }),
    ]);
    const users = new MemoryUsers();
    await expect(
      new UpdateEmployeeUseCase(employees, users, audit).execute("e1", { nationalId: "2" }, "u1"),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new UpdateEmployeeUseCase(employees, users, audit).execute("e1", { employeeNumber: "EMP-2" }, "u1"),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      new UpdateEmployeeUseCase(employees, users, audit).execute("e1", { managerId: "missing" }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new UpdateEmployeeUseCase(employees, users, audit).execute("missing", { fullName: "X" }, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("gets and lists employees", async () => {
    const employees = new MemoryEmployees([sample()]);
    expect((await new GetEmployeeByIdUseCase(employees).execute("e1")).fullName).toBe("Siti");
    await expect(new GetEmployeeByIdUseCase(employees).execute("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const listed = await new ListEmployeesUseCase(employees).execute({
      pagination: { page: 1, pageSize: 20, skip: 0, take: 20 },
    });
    expect(listed.total).toBe(1);
  });
});
