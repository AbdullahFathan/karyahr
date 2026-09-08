import { env } from "./config/env";
import { disconnectRedis } from "./config/redis";
import { createApp } from "./app";
import { disconnectPrisma } from "./shared/database/prisma";
import { closeQueues } from "./shared/queue/producer";
import { logger } from "./shared/utils/logger";

const app = createApp();
const { PORT } = env();

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server listening");
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");
  server.close();
  await Promise.all([disconnectPrisma(), disconnectRedis(), closeQueues()]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
