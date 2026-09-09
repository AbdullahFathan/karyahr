import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { EmployeePayrollProfile, EmployeeSalaryAssignment, SalaryComponent } from "../entities/Payroll";
import type {
  IEmployeePayrollProfileRepository,
  IEmployeeSalaryAssignmentRepository,
  ISalaryComponentRepository,
} from "../repositories/IPayrollRepository";
import {
  AssignSalaryUseCase,
  GetPayrollProfileUseCase,
  ListSalaryAssignmentsUseCase,
  UpsertPayrollProfileUseCase,
} from "./PayrollProfile.usecase";

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

const profileInput: Omit<EmployeePayrollProfile, "id"> = {
  employeeId: "e1",
  ptkpStatus: "TK_0",
  taxMethod: "GROSS",
  npwp: null,
  bankName: "BCA",
  bankAccountNumber: "1",
  bankAccountName: "Siti",
  bpjsKesehatanEnrolled: true,
  bpjsTkEnrolled: true,
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

class MemoryProfiles implements IEmployeePayrollProfileRepository {
  item: EmployeePayrollProfile | null = null;
  async upsert(input: Omit<EmployeePayrollProfile, "id">): Promise<EmployeePayrollProfile> {
    this.item = { id: "p1", ...input };
    return this.item;
  }
  async findByEmployeeId(employeeId: string): Promise<EmployeePayrollProfile | null> {
    return this.item?.employeeId === employeeId ? this.item : null;
  }
  async findByEmployeeIds(): Promise<readonly EmployeePayrollProfile[]> {
    return this.item ? [this.item] : [];
  }
}

class MemoryComponents implements ISalaryComponentRepository {
  constructor(private readonly item: SalaryComponent | null) {}
  async create(): Promise<SalaryComponent> {
    throw new Error("unused");
  }
  async update(): Promise<SalaryComponent> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<SalaryComponent | null> {
    return this.item && this.item.id === id ? this.item : null;
  }
  async findByCode(): Promise<SalaryComponent | null> {
    return this.item;
  }
  async list(): Promise<readonly SalaryComponent[]> {
    return this.item ? [this.item] : [];
  }
}

class MemoryAssignments implements IEmployeeSalaryAssignmentRepository {
  rows: EmployeeSalaryAssignment[] = [];
  async create(input: Omit<EmployeeSalaryAssignment, "id">): Promise<EmployeeSalaryAssignment> {
    const row = { id: "a1", ...input };
    this.rows.push(row);
    return row;
  }
  async listByEmployee(): Promise<readonly EmployeeSalaryAssignment[]> {
    return this.rows;
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };
const component: SalaryComponent = {
  id: "c1",
  code: "BASIC",
  name: "Gaji pokok",
  kind: "BASIC",
  isTaxable: true,
  isActive: true,
};

describe("payroll profile", () => {
  test("upserts and loads a profile", async () => {
    const profiles = new MemoryProfiles();
    const created = await new UpsertPayrollProfileUseCase(
      new MemoryEmployees(employee),
      profiles,
      audit,
    ).execute(profileInput, "u1");
    expect(created.bankName).toBe("BCA");
    expect((await new GetPayrollProfileUseCase(profiles).execute("e1")).id).toBe("p1");
    await expect(
      new UpsertPayrollProfileUseCase(new MemoryEmployees(null), profiles, audit).execute(profileInput, "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(new GetPayrollProfileUseCase(new MemoryProfiles()).execute("e1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("assigns salary and rejects invalid amounts or dates", async () => {
    const assignments = new MemoryAssignments();
    const useCase = new AssignSalaryUseCase(
      new MemoryEmployees(employee),
      new MemoryComponents(component),
      assignments,
      audit,
    );
    const created = await useCase.execute(
      {
        employeeId: "e1",
        componentId: "c1",
        amountRupiah: 1_000_000n,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
      "u1",
    );
    expect(created.amountRupiah).toBe(1_000_000n);
    expect(await new ListSalaryAssignmentsUseCase(assignments).execute("e1")).toHaveLength(1);
    await expect(
      useCase.execute(
        {
          employeeId: "e1",
          componentId: "c1",
          amountRupiah: -1n,
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: null,
        },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      useCase.execute(
        {
          employeeId: "e1",
          componentId: "c1",
          amountRupiah: 1n,
          effectiveFrom: new Date("2026-02-01"),
          effectiveTo: new Date("2026-01-01"),
        },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      new AssignSalaryUseCase(
        new MemoryEmployees(null),
        new MemoryComponents(component),
        assignments,
        audit,
      ).execute(
        {
          employeeId: "e1",
          componentId: "c1",
          amountRupiah: 1n,
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: null,
        },
        "u1",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new AssignSalaryUseCase(
        new MemoryEmployees(employee),
        new MemoryComponents({ ...component, isActive: false }),
        assignments,
        audit,
      ).execute(
        {
          employeeId: "e1",
          componentId: "c1",
          amountRupiah: 1n,
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: null,
        },
        "u1",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
