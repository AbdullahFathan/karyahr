import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { PaginationParams } from "../../../../shared/utils/pagination";
import type { PayrollRun } from "../entities/Payroll";
import type { IPayrollJobQueue, IPayrollRunRepository } from "../repositories/IPayrollRepository";
import { GetPayrollRunUseCase, ListPayrollRunsUseCase, QueuePayrollRunUseCase } from "./QueuePayrollRun.usecase";

class MemoryRuns implements IPayrollRunRepository {
  rows: PayrollRun[] = [];
  async create(input: {
    readonly periodType: PayrollRun["periodType"];
    readonly periodStart: Date;
    readonly periodEnd: Date;
    readonly triggeredByUserId: string;
  }): Promise<PayrollRun> {
    const run: PayrollRun = {
      id: `run-${this.rows.length + 1}`,
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: "PENDING",
      triggeredByUserId: input.triggeredByUserId,
      errorMessage: null,
      processedCount: 0,
      skippedCount: 0,
      skipReasons: [],
    };
    this.rows.push(run);
    return run;
  }
  async findById(id: string): Promise<PayrollRun | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async list(pagination: PaginationParams) {
    return {
      items: this.rows.slice(pagination.skip, pagination.skip + pagination.take),
      total: this.rows.length,
    };
  }
  async markProcessing(): Promise<PayrollRun | null> {
    return this.rows[0] ?? null;
  }
  async complete(id: string): Promise<PayrollRun> {
    return this.rows.find((row) => row.id === id)!;
  }
}

class MemoryJobs implements IPayrollJobQueue {
  enqueued: string[] = [];
  async enqueueRun(payrollRunId: string): Promise<void> {
    this.enqueued.push(payrollRunId);
  }
  async enqueuePayslipPdf(): Promise<void> {}
}

const audit: IAuditLogRepository = { append: async () => undefined };

describe("QueuePayrollRunUseCase", () => {
  test("creates a run and enqueues a job", async () => {
    const runs = new MemoryRuns();
    const jobs = new MemoryJobs();
    const run = await new QueuePayrollRunUseCase(runs, jobs, audit).execute(
      {
        periodType: "MONTHLY",
        periodStart: new Date("2026-09-01"),
        periodEnd: new Date("2026-09-30"),
      },
      "u1",
    );
    expect(jobs.enqueued).toEqual([run.id]);
    expect((await new GetPayrollRunUseCase(runs).execute(run.id)).status).toBe("PENDING");
    expect(
      (await new ListPayrollRunsUseCase(runs).execute({ page: 1, pageSize: 20, skip: 0, take: 20 })).total,
    ).toBe(1);
  });

  test("rejects an inverted period and missing run", async () => {
    const runs = new MemoryRuns();
    await expect(
      new QueuePayrollRunUseCase(runs, new MemoryJobs(), audit).execute(
        {
          periodType: "MONTHLY",
          periodStart: new Date("2026-09-30"),
          periodEnd: new Date("2026-09-01"),
        },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(new GetPayrollRunUseCase(runs).execute("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
