import Redis from "ioredis";
import { env } from "./env";

let client: Redis | undefined;

/**
 * Returns the shared Redis connection.
 */
export function getRedis(): Redis {
  if (client) {
    return client;
  }

  client = new Redis(env().REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  return client;
}

/**
 * Closes the Redis connection.
 */
export async function disconnectRedis(): Promise<void> {
  if (!client) {
    return;
  }
  await client.quit();
  client = undefined;
}
