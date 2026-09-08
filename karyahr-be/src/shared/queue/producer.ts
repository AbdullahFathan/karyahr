import { Queue } from "bullmq";
import { defaultJobOptions, getBullmqConnection } from "../../config/bullmq";
import type { NotificationEvent } from "../../modules/notifications/domain/entities/Notification";
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
 * Enqueues a job on a named queue.
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
 * Enqueues a typed notification job.
 */
export async function enqueueNotification(event: NotificationEvent): Promise<string | undefined> {
  const queue = getQueue(QUEUE_NAMES.notifications);
  const job = await queue.add(event.type, event);
  logger.debug({ jobId: job.id, type: event.type }, "Notification job enqueued");
  return job.id;
}

/**
 * Returns the leave-accrual queue for scheduling repeatable jobs.
 */
export function getLeaveAccrualQueue(): Queue {
  return getQueue(QUEUE_NAMES.leaveAccrual);
}

/**
 * Closes all queue connections.
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
}

export { QUEUE_NAMES };
