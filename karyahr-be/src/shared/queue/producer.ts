import { Queue } from "bullmq";
import { defaultJobOptions, getBullmqConnection } from "../../config/bullmq";
import { logger } from "../utils/logger";
import { QUEUE_NAMES, type QueueName } from "./names";

const queues = new Map<QueueName, Queue>();

function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) {
    return existing;
  }
  const queue = new Queue(name, {
    connection: getBullmqConnection(),
    defaultJobOptions,
  });
  queues.set(name, queue);
  return queue;
}

/**
 * Enqueues a job. Stub for Phase 0 — later modules use typed payloads.
 */
export async function enqueueJob(
  name: QueueName,
  jobName: string,
  payload: Record<string, unknown>,
): Promise<string | undefined> {
  const queue = getQueue(name);
  const job = await queue.add(jobName, payload);
  logger.debug({ queue: name, jobId: job.id, jobName }, "Job enqueued");
  return job.id;
}

/**
 * Closes all queue connections.
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
}

export { QUEUE_NAMES };
