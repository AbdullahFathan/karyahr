import { Worker, type Job } from "bullmq";
import { getBullmqConnection } from "../../config/bullmq";
import { getPrisma } from "../database/prisma";
import { PrismaEmployeeRepository } from "../../modules/employees/data/PrismaEmployeeRepository";
import {
  PrismaLeaveBalanceRepository,
  PrismaLeavePolicyRepository,
  PrismaLeaveTypeRepository,
} from "../../modules/leave/data/PrismaLeaveRepository";
import { processPayrollJob } from "../../modules/payroll/data/process-payroll-job";
import { AccrueAnnualLeaveUseCase } from "../../modules/leave/domain/usecases/AccrueAnnualLeave.usecase";
import { processNotificationJob } from "../../modules/notifications/data/process-notification-job";
import { logger } from "../utils/logger";
import { QUEUE_NAMES } from "./names";
import { getLeaveAccrualQueue } from "./producer";

/**
 * Starts the notifications worker. Callers own lifecycle.
 */
export function createNotificationWorker(): Worker {
  return new Worker(
    QUEUE_NAMES.notifications,
    async (job: Job) => {
      await processNotificationJob(job);
    },
    { connection: getBullmqConnection() },
  );
}

/**
 * Starts the monthly leave-accrual worker.
 */
export function createLeaveAccrualWorker(): Worker {
  return new Worker(
    QUEUE_NAMES.leaveAccrual,
    async (job: Job) => {
      const prisma = getPrisma();
      const useCase = new AccrueAnnualLeaveUseCase(
        new PrismaEmployeeRepository(prisma),
        new PrismaLeaveTypeRepository(prisma),
        new PrismaLeavePolicyRepository(prisma),
        new PrismaLeaveBalanceRepository(prisma),
      );
      const result = await useCase.execute();
      logger.info({ jobId: job.id, accrued: result.accrued }, "Leave accrual completed");
    },
    { connection: getBullmqConnection() },
  );
}

/**
 * Starts the payroll worker.
 */
export function createPayrollWorker(): Worker {
  return new Worker(
    QUEUE_NAMES.payroll,
    async (job: Job) => {
      await processPayrollJob(job);
    },
    { connection: getBullmqConnection() },
  );
}

/**
 * Registers the repeatable monthly accrual job (1st of month 01:00 Asia/Jakarta).
 */
export async function scheduleLeaveAccrual(): Promise<void> {
  const queue = getLeaveAccrualQueue();
  await queue.add(
    "accrue-annual-leave",
    {},
    {
      jobId: "leave-accrual-monthly",
      repeat: { pattern: "0 1 1 * *", tz: "Asia/Jakarta" },
    },
  );
}
