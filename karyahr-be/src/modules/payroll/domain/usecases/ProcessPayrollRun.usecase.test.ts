import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type {
  EmployeePayrollProfile,
  PayrollEmployeeSnapshot,
  PayrollRun,
  PayrollRunSkip,
  Payslip,
} from "../entities/Payroll";
import type {
  IApprovedLeaveDaysLookup,
  IAttendanceHoursLookup,
  IPayrollEmployeeSource,
  IPayrollJobQueue,
  IPayrollRunRepository,
  IPayslipRepository,
} from "../repositories/IPayrollRepository";
import { DEFAULT_STATUTORY_RATES } from "../statutory/rates";
import { ProcessPayrollRunUseCase } from "./ProcessPayrollRun.usecase";
import { GeneratePayslipPdfUseCase } from "./GeneratePayslipPdf.usecase";
import type { IObjectStorage, StoredObject } from "../../../../shared/storage/IObjectStorage";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { Employee } from "../../../employees/domain/entities/Employee";
import { Readable } from "node:stream";

const profile: EmployeePayrollProfile = {
  id: "p1",
  employeeId: "e1",
  ptkpStatus: "TK_0",
  taxMethod: "GROSS",
  npwp: null,
  bankName: "BCA",
  bankAccountNumber: "1",
  bankAccountName: "Ada",
  bpjsKesehatanEnrolled: true,
  bpjsTkEnrolled: true,
};

const eligible: PayrollEmployeeSnapshot = {
  employeeId: "e1",
  userId: "u1",
  fullName: "Ada",
  employeeNumber: "EMP-1",
  profile,
  assignments: [
    {
      component: {
        id: "c1",
        code: "BASIC",
        name: "Gaji pokok",
        kind: "BASIC",
        isTaxable: true,
        isActive: true,
      },
      amountRupiah: 8_000_000n,
    },
  ],
};

class MemoryRuns implements IPayrollRunRepository {
  run: PayrollRun = {
    id: "run-1",
    periodType: "MONTHLY",
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    status: "PENDING",
    triggeredByUserId: "hr-1",
    errorMessage: null,
    processedCount: 0,
    skippedCount: 0,
    skipReasons: [],
  };

  async create(): Promise<PayrollRun> {
    return this.run;
  }
  async findById(): Promise<PayrollRun | null> {
    return this.run;
  }
  async list(): Promise<readonly PayrollRun[]> {
    return [this.run];
  }
  async markProcessing(): Promise<PayrollRun | null> {
    if (this.run.status !== "PENDING") {
      return null;
    }
    this.run = { ...this.run, status: "PROCESSING" };
    return this.run;
  }
  async complete(
    id: string,
    input: {
      readonly status: "COMPLETED" | "FAILED";
      readonly processedCount: number;
      readonly skippedCount: number;
      readonly skipReasons: readonly PayrollRunSkip[];
      readonly errorMessage: string | null;
    },
  ): Promise<PayrollRun> {
    this.run = {
      ...this.run,
      id,
      status: input.status,
      processedCount: input.processedCount,
      skippedCount: input.skippedCount,
      skipReasons: input.skipReasons,
      errorMessage: input.errorMessage,
    };
    return this.run;
  }
}

class MemoryPayslips implements IPayslipRepository {
  items: Payslip[] = [];
  async create(input: Omit<Payslip, "id">): Promise<Payslip> {
    const row: Payslip = { ...input, id: `ps-${this.items.length + 1}` };
    this.items.push(row);
    return row;
  }
  async findById(id: string): Promise<Payslip | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByRunAndEmployee(payrollRunId: string, employeeId: string): Promise<Payslip | null> {
    return this.items.find((item) => item.payrollRunId === payrollRunId && item.employeeId === employeeId) ?? null;
  }
  async listByRun(): Promise<readonly Payslip[]> {
    return this.items;
  }
  async listByEmployee(): Promise<readonly Payslip[]> {
    return this.items;
  }
  async listByYear(): Promise<readonly Payslip[]> {
    return this.items;
  }
  async setPdfObjectKey(id: string, objectKey: string): Promise<Payslip> {
    this.items = this.items.map((item) => (item.id === id ? { ...item, pdfObjectKey: objectKey } : item));
    return this.items.find((item) => item.id === id)!;
  }
}

class MemoryEmployees implements IPayrollEmployeeSource {
  constructor(private readonly rows: readonly PayrollEmployeeSnapshot[]) {}
  async listEligible(): Promise<readonly PayrollEmployeeSnapshot[]> {
    return this.rows;
  }
}

class MemoryAttendance implements IAttendanceHoursLookup {
  constructor(
    private readonly open: boolean,
    private readonly overtime: number,
  ) {}
  async hasOpenInPeriod(): Promise<boolean> {
    return this.open;
  }
  async sumOvertimeMinutes(): Promise<number> {
    return this.overtime;
  }
}

class MemoryLeave implements IApprovedLeaveDaysLookup {
  async countDays(): Promise<number> {
    return 0;
  }
}

class MemoryJobs implements IPayrollJobQueue {
  pdfs: string[] = [];
  async enqueueRun(): Promise<void> {}
  async enqueuePayslipPdf(payslipId: string): Promise<void> {
    this.pdfs.push(payslipId);
  }
}

class MemoryNotes implements INotificationDispatcher {
  events: string[] = [];
  async dispatch(event: { type: string }): Promise<void> {
    this.events.push(event.type);
  }
}

class MemoryAudit implements IAuditLogRepository {
  async append(): Promise<void> {}
}

function useCase(
  runs: MemoryRuns,
  payslips: MemoryPayslips,
  open: boolean,
  jobs = new MemoryJobs(),
  notes = new MemoryNotes(),
): ProcessPayrollRunUseCase {
  return new ProcessPayrollRunUseCase(
    runs,
    payslips,
    new MemoryEmployees([eligible]),
    new MemoryAttendance(open, 60),
    new MemoryLeave(),
    { getRates: async () => DEFAULT_STATUTORY_RATES },
    jobs,
    notes,
    new MemoryAudit(),
  );
}

describe("ProcessPayrollRunUseCase", () => {
  test("skips employees with open attendance", async () => {
    const runs = new MemoryRuns();
    const payslips = new MemoryPayslips();
    const result = await useCase(runs, payslips, true).execute("run-1");
    expect(result.status).toBe("FAILED");
    expect(result.skippedCount).toBe(1);
    expect(payslips.items).toHaveLength(0);
  });

  test("creates a payslip, enqueues PDF, and notifies", async () => {
    const runs = new MemoryRuns();
    const payslips = new MemoryPayslips();
    const jobs = new MemoryJobs();
    const notes = new MemoryNotes();
    const result = await useCase(runs, payslips, false, jobs, notes).execute("run-1");
    expect(result.status).toBe("COMPLETED");
    expect(payslips.items).toHaveLength(1);
    expect(jobs.pdfs).toEqual(["ps-1"]);
    expect(notes.events).toEqual(["payroll.payslip_ready"]);
  });

  test("is idempotent when a payslip already exists", async () => {
    const runs = new MemoryRuns();
    const payslips = new MemoryPayslips();
    await useCase(runs, payslips, false).execute("run-1");
    runs.run = { ...runs.run, status: "PENDING" };
    const second = await useCase(runs, payslips, false, new MemoryJobs(), new MemoryNotes()).execute("run-1");
    expect(second.processedCount).toBe(1);
    expect(payslips.items).toHaveLength(1);
  });
});

class MemoryStorage implements IObjectStorage {
  keys = new Set<string>();
  async putObject(key: string): Promise<void> {
    this.keys.add(key);
  }
  async getObject(): Promise<StoredObject> {
    return { stream: Readable.from([]), contentType: "application/pdf" };
  }
  async deleteObject(): Promise<void> {}
}

class MemoryHrEmployees implements IEmployeeRepository {
  async create(): Promise<Employee> {
    throw new Error("unused");
  }
  async update(): Promise<Employee> {
    throw new Error("unused");
  }
  async findById(): Promise<Employee | null> {
    return {
      id: "e1",
      fullName: "Ada",
      nationalId: "1",
      birthDate: new Date("1990-01-01"),
      address: "Jakarta",
      phone: "0",
      emergencyContact: "0",
      employeeNumber: "EMP-1",
      departmentId: "d",
      positionId: "p",
      managerId: null,
      joinedAt: new Date("2020-01-01"),
      status: "ACTIVE",
      contractType: "PERMANENT",
    };
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list(): Promise<{ items: readonly Employee[]; total: number }> {
    return { items: [], total: 0 };
  }
  async listDirectory(): Promise<readonly Employee[]> {
    return [];
  }
}

describe("GeneratePayslipPdfUseCase", () => {
  test("does not rewrite storage when pdfObjectKey is set", async () => {
    const payslips = new MemoryPayslips();
    await payslips.create({
      payrollRunId: "run-1",
      employeeId: "e1",
      grossRupiah: 1n,
      statutoryRupiah: 0n,
      netRupiah: 1n,
      lines: [],
      pdfObjectKey: "payroll/payslips/run-1/e1.pdf",
    });
    const storage = new MemoryStorage();
    const key = await new GeneratePayslipPdfUseCase(
      payslips,
      new MemoryRuns(),
      new MemoryHrEmployees(),
      storage,
      "KaryaHR",
    ).execute("ps-1");
    expect(key).toBe("payroll/payslips/run-1/e1.pdf");
    expect(storage.keys.size).toBe(0);
  });
});
