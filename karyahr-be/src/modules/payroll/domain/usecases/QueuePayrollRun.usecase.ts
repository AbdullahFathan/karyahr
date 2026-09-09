import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { PaginationParams } from "../../../../shared/utils/pagination";
import type { PayrollPeriodType, PayrollRun } from "../entities/Payroll";
import type { IPayrollJobQueue, IPayrollRunRepository } from "../repositories/IPayrollRepository";

/**
 * Queues an asynchronous payroll run and returns immediately.
 */
export class QueuePayrollRunUseCase {
  constructor(
    private readonly runs: IPayrollRunRepository,
    private readonly jobs: IPayrollJobQueue,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    input: {
      readonly periodType: PayrollPeriodType;
      readonly periodStart: Date;
      readonly periodEnd: Date;
    },
    actorUserId: string,
  ): Promise<PayrollRun> {
    if (input.periodEnd.getTime() < input.periodStart.getTime()) {
      throw new ValidationError("periodEnd must be on or after periodStart");
    }
    const run = await this.runs.create({
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      triggeredByUserId: actorUserId,
    });
    await this.jobs.enqueueRun(run.id);
    await this.audit.append({
      actorUserId,
      entityType: "PayrollRun",
      entityId: run.id,
      action: "queue",
    });
    return run;
  }
}

/**
 * Loads one payroll run.
 */
export class GetPayrollRunUseCase {
  constructor(private readonly runs: IPayrollRunRepository) {}

  async execute(id: string): Promise<PayrollRun> {
    const run = await this.runs.findById(id);
    if (!run) {
      throw new NotFoundError("Payroll run not found");
    }
    return run;
  }
}

/**
 * Lists payroll runs.
 */
export class ListPayrollRunsUseCase {
  constructor(private readonly runs: IPayrollRunRepository) {}

  execute(pagination: PaginationParams) {
    return this.runs.list(pagination);
  }
}
