import { ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import type { Payslip } from "../entities/Payroll";
import type { IPayrollRunRepository, IPayslipRepository } from "../repositories/IPayrollRepository";

/**
 * Lists the current employee's payslips, optionally filtered by period.
 */
export class ListMyPayslipsUseCase {
  constructor(private readonly payslips: IPayslipRepository) {}

  execute(employeeId: string, from?: Date, to?: Date): Promise<readonly Payslip[]> {
    return this.payslips.listByEmployee(employeeId, from, to);
  }
}

/**
 * Loads a payslip when the caller owns it or has HR payroll read access.
 */
export class GetPayslipUseCase {
  constructor(private readonly payslips: IPayslipRepository) {}

  async execute(
    id: string,
    actor: { readonly employeeId: string; readonly canReadAll: boolean },
  ): Promise<Payslip> {
    const payslip = await this.payslips.findById(id);
    if (!payslip) {
      throw new NotFoundError("Payslip not found");
    }
    if (!actor.canReadAll && payslip.employeeId !== actor.employeeId) {
      throw new ForbiddenError("Cannot view another employee's payslip");
    }
    return payslip;
  }
}

/**
 * Lists payslips for a payroll run.
 */
export class ListRunPayslipsUseCase {
  constructor(
    private readonly runs: IPayrollRunRepository,
    private readonly payslips: IPayslipRepository,
  ) {}

  async execute(payrollRunId: string): Promise<readonly Payslip[]> {
    const run = await this.runs.findById(payrollRunId);
    if (!run) {
      throw new NotFoundError("Payroll run not found");
    }
    return this.payslips.listByRun(payrollRunId);
  }
}

export type PayslipPdfFile = {
  readonly fileName: string;
  readonly contentType: string;
  readonly stream: import("node:stream").Readable;
};

/**
 * Streams a generated payslip PDF from object storage.
 */
export class GetPayslipPdfUseCase {
  constructor(
    private readonly payslips: IPayslipRepository,
    private readonly storage: IObjectStorage,
  ) {}

  async execute(
    id: string,
    actor: { readonly employeeId: string; readonly canReadAll: boolean },
  ): Promise<PayslipPdfFile> {
    const payslip = await this.payslips.findById(id);
    if (!payslip) {
      throw new NotFoundError("Payslip not found");
    }
    if (!actor.canReadAll && payslip.employeeId !== actor.employeeId) {
      throw new ForbiddenError("Cannot view another employee's payslip");
    }
    if (!payslip.pdfObjectKey) {
      throw new NotFoundError("Payslip PDF is not ready yet");
    }
    const object = await this.storage.getObject(payslip.pdfObjectKey);
    return {
      fileName: `payslip-${payslip.id}.pdf`,
      contentType: object.contentType ?? "application/pdf",
      stream: object.stream,
    };
  }
}
