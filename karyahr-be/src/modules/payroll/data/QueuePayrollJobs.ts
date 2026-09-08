import { enqueueJob } from "../../../shared/queue/producer";
import { QUEUE_NAMES } from "../../../shared/queue/names";
import type { IPayrollJobQueue } from "../domain/repositories/IPayrollRepository";

/**
 * Enqueues payroll run and payslip PDF jobs.
 */
export class QueuePayrollJobs implements IPayrollJobQueue {
  async enqueueRun(payrollRunId: string): Promise<void> {
    await enqueueJob(QUEUE_NAMES.payroll, "payroll.run", { payrollRunId });
  }

  async enqueuePayslipPdf(payslipId: string): Promise<void> {
    await enqueueJob(QUEUE_NAMES.payroll, "payroll.payslip_pdf", { payslipId });
  }
}
