import { createApp } from "../../src/app";
import { disconnectRedis } from "../../src/config/redis";
import { disconnectPrisma } from "../../src/shared/database/prisma";

type E2eServer = {
  readonly baseUrl: string;
  close: () => Promise<void>;
};

let started: Promise<E2eServer> | undefined;

/**
 * Starts the Express app on an ephemeral port once per process.
 */
export function startE2eServer(): Promise<E2eServer> {
  started ??= boot();
  return started;
}

/**
 * Stops the in-process server and closes Prisma/Redis.
 */
export async function stopE2eServer(): Promise<void> {
  if (!started) {
    return;
  }
  const server = await started;
  started = undefined;
  await server.close();
}

async function boot(): Promise<E2eServer> {
  const app = createApp();
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    httpServer.once("listening", resolve);
    httpServer.once("error", reject);
  });
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("E2E server did not bind a TCP port");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const ready = await fetch(`${baseUrl}/ready`);
  if (!ready.ok) {
    httpServer.close();
    throw new Error(
      "E2E requires Postgres and Redis. Start Compose, run migrate and seed, then retry.",
    );
  }
  return {
    baseUrl,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await Promise.all([disconnectPrisma(), disconnectRedis()]);
    },
  };
}
