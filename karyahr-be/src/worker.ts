import { env } from "./config/env";
import { disconnectRedis } from "./config/redis";
import { disconnectPrisma } from "./shared/database/prisma";
import { closeQueues } from "./shared/queue/producer";
import {
  createLeaveAccrualWorker,
  createNotificationWorker,
  createPayrollWorker,
  scheduleLeaveAccrual,
} from "./shared/queue/worker";
import { logger } from "./shared/utils/logger";

env();

const notificationWorker = createNotificationWorker();
const accrualWorker = createLeaveAccrualWorker();
const payrollWorker = createPayrollWorker();

notificationWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id }, "Notification job failed");
});
accrualWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id }, "Leave accrual job failed");
});
payrollWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id }, "Payroll job failed");
});

void scheduleLeaveAccrual()
  .then(() => {
    logger.info("Workers started");
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, "Failed to schedule leave accrual");
  });

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Worker shutting down");
  await Promise.all([
    notificationWorker.close(),
    accrualWorker.close(),
    payrollWorker.close(),
    closeQueues(),
    disconnectPrisma(),
    disconnectRedis(),
  ]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
