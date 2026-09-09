import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error";
import type { IObjectStorage, StoredObject } from "../../../../shared/storage/IObjectStorage";
import type { PayrollRun, Payslip } from "../entities/Payroll";
import type { IPayrollRunRepository, IPayslipRepository } from "../repositories/IPayrollRepository";
import {
  GetPayslipPdfUseCase,
  GetPayslipUseCase,
  ListMyPayslipsUseCase,
  ListRunPayslipsUseCase,
} from "./PayslipQuery.usecase";

const payslip: Payslip = {
  id: "ps1",
  payrollRunId: "run1",
  employeeId: "e1",
  grossRupiah: 1n,
  statutoryRupiah: 0n,
  netRupiah: 1n,
  lines: [],
  pdfObjectKey: "payslips/ps1.pdf",
};

const run: PayrollRun = {
  id: "run1",
  periodType: "MONTHLY",
  periodStart: new Date("2026-09-01"),
  periodEnd: new Date("2026-09-30"),
  status: "COMPLETED",
  triggeredByUserId: "u1",
  errorMessage: null,
  processedCount: 1,
  skippedCount: 0,
  skipReasons: [],
};

class MemoryPayslips implements IPayslipRepository {
  constructor(private readonly item: Payslip | null) {}
  async create(): Promise<Payslip> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<Payslip | null> {
    return this.item && this.item.id === id ? this.item : null;
  }
  async findByRunAndEmployee(): Promise<Payslip | null> {
    return this.item;
  }
  async listByRun(): Promise<readonly Payslip[]> {
    return this.item ? [this.item] : [];
  }
  async listByRunPage() {
    return { items: this.item ? [this.item] : [], total: this.item ? 1 : 0 };
  }
  async listByEmployee(): Promise<readonly Payslip[]> {
    return this.item ? [this.item] : [];
  }
  async listByEmployeePage() {
    return { items: this.item ? [this.item] : [], total: this.item ? 1 : 0 };
  }
  async listByYear(): Promise<readonly Payslip[]> {
    return this.item ? [this.item] : [];
  }
  async setPdfObjectKey(): Promise<Payslip> {
    return this.item!;
  }
}

class MemoryRuns implements IPayrollRunRepository {
  constructor(private readonly item: PayrollRun | null) {}
  async create(): Promise<PayrollRun> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<PayrollRun | null> {
    return this.item && this.item.id === id ? this.item : null;
  }
  async list() {
    return { items: this.item ? [this.item] : [], total: this.item ? 1 : 0 };
  }
  async markProcessing(): Promise<PayrollRun | null> {
    return this.item;
  }
  async complete(): Promise<PayrollRun> {
    return this.item!;
  }
}

class MemoryStorage implements IObjectStorage {
  async putObject(): Promise<void> {}
  async getObject(): Promise<StoredObject> {
    return { stream: Readable.from(["pdf"]), contentType: "application/pdf" };
  }
  async deleteObject(): Promise<void> {}
}

const pagination = { page: 1, pageSize: 20, skip: 0, take: 20 };

describe("PayslipQuery", () => {
  test("lists own payslips and forbids another employee", async () => {
    const payslips = new MemoryPayslips(payslip);
    expect((await new ListMyPayslipsUseCase(payslips).execute("e1", pagination)).total).toBe(1);
    expect((await new GetPayslipUseCase(payslips).execute("ps1", { employeeId: "e1", canReadAll: false })).id).toBe(
      "ps1",
    );
    await expect(
      new GetPayslipUseCase(payslips).execute("ps1", { employeeId: "e2", canReadAll: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      new GetPayslipUseCase(payslips).execute("missing", { employeeId: "e1", canReadAll: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("lists run payslips and streams a PDF", async () => {
    const payslips = new MemoryPayslips(payslip);
    const listed = await new ListRunPayslipsUseCase(new MemoryRuns(run), payslips).execute("run1", pagination);
    expect(listed.total).toBe(1);
    await expect(
      new ListRunPayslipsUseCase(new MemoryRuns(null), payslips).execute("missing", pagination),
    ).rejects.toBeInstanceOf(NotFoundError);
    const pdf = await new GetPayslipPdfUseCase(payslips, new MemoryStorage()).execute("ps1", {
      employeeId: "e1",
      canReadAll: false,
    });
    expect(pdf.fileName).toBe("payslip-ps1.pdf");
    await expect(
      new GetPayslipPdfUseCase(new MemoryPayslips({ ...payslip, pdfObjectKey: null }), new MemoryStorage()).execute(
        "ps1",
        { employeeId: "e1", canReadAll: true },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new GetPayslipPdfUseCase(payslips, new MemoryStorage()).execute("ps1", {
        employeeId: "e2",
        canReadAll: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
