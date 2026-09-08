import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import { assemblePayslip } from "../statutory/assemblePayslip";
import type {
  IApprovedLeaveDaysLookup,
  IAttendanceHoursLookup,
  IPayrollEmployeeSource,
  IPayrollJobQueue,
  IPayrollRunRepository,
  IPayslipRepository,
  IStatutorySettingRepository,
} from "../repositories/IPayrollRepository";
import type { PayrollRun, PayrollRunSkip } from "../entities/Payroll";

/**
 * Processes a queued payroll run: skip employees with open attendance, persist payslips, enqueue PDFs.
 */
export class ProcessPayrollRunUseCase {
  constructor(
    private readonly runs: IPayrollRunRepository,
    private readonly payslips: IPayslipRepository,
    private readonly employees: IPayrollEmployeeSource,
    private readonly attendance: IAttendanceHoursLookup,
    private readonly leave: IApprovedLeaveDaysLookup,
    private readonly statutory: IStatutorySettingRepository,
    private readonly jobs: IPayrollJobQueue,
    private readonly notifications: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(payrollRunId: string): Promise<PayrollRun> {
    const claimed = await this.runs.markProcessing(payrollRunId);
    if (!claimed) {
      const existing = await this.runs.findById(payrollRunId);
      if (!existing) {
        throw new Error(`Payroll run ${payrollRunId} not found`);
      }
      return existing;
    }

    const rates = await this.statutory.getRates();
    const snapshots = await this.employees.listEligible(claimed.periodStart, claimed.periodEnd);
    const skips: PayrollRunSkip[] = [];
    let processed = 0;

    for (const snapshot of snapshots) {
      const existing = await this.payslips.findByRunAndEmployee(claimed.id, snapshot.employeeId);
      if (existing) {
        processed += 1;
        continue;
      }
      const hasBasic = snapshot.assignments.some((item) => item.component.kind === "BASIC");
      if (!hasBasic) {
        skips.push({ employeeId: snapshot.employeeId, reason: "Missing BASIC salary assignment" });
        continue;
      }
      const hasOpen = await this.attendance.hasOpenInPeriod(
        snapshot.employeeId,
        claimed.periodStart,
        claimed.periodEnd,
      );
      if (hasOpen) {
        skips.push({ employeeId: snapshot.employeeId, reason: "Open attendance in period" });
        continue;
      }
      await this.leave.countDays(snapshot.employeeId, claimed.periodStart, claimed.periodEnd);
      const overtimeMinutes = await this.attendance.sumOvertimeMinutes(
        snapshot.employeeId,
        claimed.periodStart,
        claimed.periodEnd,
      );
      const assembled = assemblePayslip({ employee: snapshot, overtimeMinutes, rates });
      const payslip = await this.payslips.create({
        payrollRunId: claimed.id,
        employeeId: snapshot.employeeId,
        grossRupiah: assembled.grossRupiah,
        statutoryRupiah: assembled.statutoryRupiah,
        netRupiah: assembled.netRupiah,
        lines: assembled.lines,
        pdfObjectKey: null,
      });
      await this.jobs.enqueuePayslipPdf(payslip.id);
      if (snapshot.userId) {
        await this.notifications.dispatch({
          type: "payroll.payslip_ready",
          recipientUserId: snapshot.userId,
          title: "Slip gaji tersedia",
          body: `Slip gaji periode ${claimed.periodStart.toISOString().slice(0, 10)} – ${claimed.periodEnd.toISOString().slice(0, 10)} sudah diproses.`,
          entityType: "Payslip",
          entityId: payslip.id,
        });
      }
      processed += 1;
    }

    const status = processed === 0 ? "FAILED" : "COMPLETED";
    const completed = await this.runs.complete(claimed.id, {
      status,
      processedCount: processed,
      skippedCount: skips.length,
      skipReasons: skips,
      errorMessage: status === "FAILED" ? "No employees were processed" : null,
    });
    await this.audit.append({
      actorUserId: claimed.triggeredByUserId,
      entityType: "PayrollRun",
      entityId: claimed.id,
      action: "process",
      metadata: { processed, skipped: skips.length, status },
    });
    return completed;
  }
}
