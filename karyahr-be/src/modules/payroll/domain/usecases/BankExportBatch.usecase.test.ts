import { describe, expect, test } from "bun:test";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { EmployeePayrollProfile, Payslip, PayrollRun } from "../entities/Payroll";
import type {
  IEmployeePayrollProfileRepository,
  IPayrollExportRepository,
  IPayrollRunRepository,
  IPayslipRepository,
} from "../repositories/IPayrollRepository";
import { GeneratePayrollExportUseCase } from "./GeneratePayrollExport.usecase";

class MemoryRuns implements IPayrollRunRepository {
  constructor(private readonly run: PayrollRun) {}
  async create(): Promise<PayrollRun> {
    return this.run;
  }
  async findById() {
    return this.run;
  }
  async list() {
    return { items: [this.run], total: 1 };
  }
  async markProcessing() {
    return this.run;
  }
  async complete() {
    return this.run;
  }
}

class MemoryPayslips implements IPayslipRepository {
  constructor(private readonly items: Payslip[]) {}
  async create() {
    return this.items[0]!;
  }
  async findById() {
    return this.items[0]!;
  }
  async findByRunAndEmployee() {
    return null;
  }
  async listByRun() {
    return this.items;
  }
  async listByRunPage() {
    return { items: this.items, total: this.items.length };
  }
  async listByEmployee() {
    return this.items;
  }
  async listByEmployeePage() {
    return { items: this.items, total: this.items.length };
  }
  async listByYear() {
    return this.items;
  }
  async setPdfObjectKey() {
    return this.items[0]!;
  }
}

class MemoryExports implements IPayrollExportRepository {
  lastKey: string | null = null;
  async create(input: { objectKey: string }) {
    this.lastKey = input.objectKey;
    return { id: "exp-1", payrollRunId: "run-1", kind: "BANK_TRANSFER" as const, objectKey: input.objectKey };
  }
  async findByRunAndKind() {
    return null;
  }
}

class MemoryEmployees implements IEmployeeRepository {
  findByIdCalls = 0;
  findByIdsCalls = 0;
  constructor(private readonly items: Employee[]) {}
  async create() {
    return this.items[0]!;
  }
  async update() {
    return this.items[0]!;
  }
  async findById(id: string) {
    this.findByIdCalls += 1;
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByIds(ids: readonly string[]) {
    this.findByIdsCalls += 1;
    return this.items.filter((item) => ids.includes(item.id));
  }
  async findByNationalId() {
    return null;
  }
  async findByEmployeeNumber() {
    return null;
  }
  async list() {
    return { items: this.items, total: this.items.length };
  }
  async listDirectory() {
    return { items: this.items, total: this.items.length };
  }
}

class MemoryProfiles implements IEmployeePayrollProfileRepository {
  findByEmployeeIdCalls = 0;
  findByEmployeeIdsCalls = 0;
  constructor(private readonly items: EmployeePayrollProfile[]) {}
  async upsert() {
    return this.items[0]!;
  }
  async findByEmployeeId(employeeId: string) {
    this.findByEmployeeIdCalls += 1;
    return this.items.find((item) => item.employeeId === employeeId) ?? null;
  }
  async findByEmployeeIds(employeeIds: readonly string[]) {
    this.findByEmployeeIdsCalls += 1;
    return this.items.filter((item) => employeeIds.includes(item.employeeId));
  }
}

class MemoryStorage implements IObjectStorage {
  bodies: Buffer[] = [];
  async putObject(_key: string, body: Buffer) {
    this.bodies.push(body);
  }
  async getObject() {
    throw new Error("unused");
  }
  async deleteObject() {}
}

describe("GeneratePayrollExportUseCase bank CSV", () => {
  test("batches employee and profile lookups", async () => {
    const run: PayrollRun = {
      id: "run-1",
      periodType: "MONTHLY",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-01-31"),
      status: "COMPLETED",
      triggeredByUserId: "u1",
      errorMessage: null,
      processedCount: 2,
      skippedCount: 0,
      skipReasons: [],
    };
    const slips: Payslip[] = [
      {
        id: "p1",
        payrollRunId: "run-1",
        employeeId: "e1",
        grossRupiah: 1_000_000n,
        statutoryRupiah: 100_000n,
        netRupiah: 900_000n,
        lines: [],
        pdfObjectKey: null,
      },
      {
        id: "p2",
        payrollRunId: "run-1",
        employeeId: "e2",
        grossRupiah: 2_000_000n,
        statutoryRupiah: 200_000n,
        netRupiah: 1_800_000n,
        lines: [],
        pdfObjectKey: null,
      },
    ];
    const employees = new MemoryEmployees([
      {
        id: "e1",
        fullName: "One",
        nationalId: "1",
        birthDate: new Date("1990-01-01"),
        address: "a",
        phone: "1",
        emergencyContact: "1",
        employeeNumber: "EMP-1",
        departmentId: "d1",
        positionId: "p1",
        managerId: null,
        joinedAt: new Date("2020-01-01"),
        status: "ACTIVE",
        contractType: "PERMANENT",
      },
      {
        id: "e2",
        fullName: "Two",
        nationalId: "2",
        birthDate: new Date("1990-01-01"),
        address: "a",
        phone: "2",
        emergencyContact: "2",
        employeeNumber: "EMP-2",
        departmentId: "d1",
        positionId: "p1",
        managerId: null,
        joinedAt: new Date("2020-01-01"),
        status: "ACTIVE",
        contractType: "PERMANENT",
      },
    ]);
    const profiles = new MemoryProfiles([
      {
        id: "pr1",
        employeeId: "e1",
        ptkpStatus: "TK_0",
        taxMethod: "GROSS",
        npwp: null,
        bankName: "BCA",
        bankAccountNumber: "111",
        bankAccountName: "One",
        bpjsKesehatanEnrolled: true,
        bpjsTkEnrolled: true,
      },
      {
        id: "pr2",
        employeeId: "e2",
        ptkpStatus: "TK_0",
        taxMethod: "GROSS",
        npwp: null,
        bankName: "BCA",
        bankAccountNumber: "222",
        bankAccountName: "Two",
        bpjsKesehatanEnrolled: true,
        bpjsTkEnrolled: true,
      },
    ]);
    const storage = new MemoryStorage();
    await new GeneratePayrollExportUseCase(
      new MemoryRuns(run),
      new MemoryPayslips(slips),
      new MemoryExports(),
      employees,
      profiles,
      storage,
    ).execute({ payrollRunId: "run-1", kind: "BANK_TRANSFER" });

    expect(employees.findByIdsCalls).toBe(1);
    expect(employees.findByIdCalls).toBe(0);
    expect(profiles.findByEmployeeIdsCalls).toBe(1);
    expect(profiles.findByEmployeeIdCalls).toBe(0);
    expect(storage.bodies[0]?.toString("utf8")).toContain("111");
    expect(storage.bodies[0]?.toString("utf8")).toContain("222");
  });
});
