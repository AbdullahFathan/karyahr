import type { Job } from "bullmq";
import { env } from "../../../config/env";
import { PrismaAuditLogRepository } from "../../../shared/audit/PrismaAuditLogRepository";
import { createAesGcmCipherFromEnv } from "../../../shared/crypto/aes-gcm";
import { getPrisma } from "../../../shared/database/prisma";
import { createObjectStorage } from "../../../shared/storage/createObjectStorage";
import { PrismaEmployeeRepository } from "../../employees/data/PrismaEmployeeRepository";
import { QueueNotificationDispatcher } from "../../notifications/data/QueueNotificationDispatcher";
import { PrismaAttendanceHoursLookup, PrismaApprovedLeaveDaysLookup } from "./PrismaPayrollLookups";
import {
  PrismaPayrollEmployeeSource,
  PrismaPayrollRunRepository,
  PrismaPayslipRepository,
  PrismaStatutorySettingRepository,
} from "./PrismaPayrollRepository";
import { QueuePayrollJobs } from "./QueuePayrollJobs";
import { GeneratePayslipPdfUseCase } from "../domain/usecases/GeneratePayslipPdf.usecase";
import { ProcessPayrollRunUseCase } from "../domain/usecases/ProcessPayrollRun.usecase";

function asRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    return {};
  }
  return data as Record<string, unknown>;
}

/**
 * Processes payroll.run and payroll.payslip_pdf jobs.
 */
export async function processPayrollJob(job: Job): Promise<void> {
  const prisma = getPrisma();
  const cipher = createAesGcmCipherFromEnv();
  const payload = asRecord(job.data);
  if (job.name === "payroll.run") {
    const payrollRunId = payload.payrollRunId;
    if (typeof payrollRunId !== "string") {
      throw new Error("payroll.run requires payrollRunId");
    }
    const useCase = new ProcessPayrollRunUseCase(
      new PrismaPayrollRunRepository(prisma),
      new PrismaPayslipRepository(prisma, cipher),
      new PrismaPayrollEmployeeSource(prisma, cipher),
      new PrismaAttendanceHoursLookup(prisma),
      new PrismaApprovedLeaveDaysLookup(prisma),
      new PrismaStatutorySettingRepository(prisma),
      new QueuePayrollJobs(),
      new QueueNotificationDispatcher(),
      new PrismaAuditLogRepository(prisma),
    );
    await useCase.execute(payrollRunId);
    return;
  }
  if (job.name === "payroll.payslip_pdf") {
    const payslipId = payload.payslipId;
    if (typeof payslipId !== "string") {
      throw new Error("payroll.payslip_pdf requires payslipId");
    }
    const useCase = new GeneratePayslipPdfUseCase(
      new PrismaPayslipRepository(prisma, cipher),
      new PrismaPayrollRunRepository(prisma),
      new PrismaEmployeeRepository(prisma),
      createObjectStorage(),
      env().COMPANY_NAME,
    );
    await useCase.execute(payslipId);
    return;
  }
  throw new Error(`Unknown payroll job ${job.name}`);
}
