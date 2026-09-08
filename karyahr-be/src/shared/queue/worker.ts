import { Worker, type Job } from "bullmq";
import { getBullmqConnection } from "../../config/bullmq";
import { logger } from "../utils/logger";
import { QUEUE_NAMES } from "./names";

/**
 * Starts a stub worker that logs jobs. Callers own lifecycle; Phase 0 does not auto-start.
 */
export function createNotificationWorker(): Worker {
  return new Worker(
    QUEUE_NAMES.notifications,
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name, data: job.data }, "Stub worker processed job");
    },
    { connection: getBullmqConnection() },
  );
}
