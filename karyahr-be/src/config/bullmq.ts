import type { ConnectionOptions } from "bullmq";
import { env } from "./env";

/**
 * BullMQ connection options derived from REDIS_URL.
 */
export function getBullmqConnection(): ConnectionOptions {
  const url = new URL(env().REDIS_URL);
  const port = url.port ? Number(url.port) : 6379;
  const db = url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0;

  return {
    host: url.hostname,
    port,
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isNaN(db) ? 0 : db,
    maxRetriesPerRequest: null,
  };
}

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
};
