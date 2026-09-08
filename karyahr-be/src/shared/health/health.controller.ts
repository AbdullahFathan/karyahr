import type { Request, Response } from "express";
import { getRedis } from "../../config/redis";
import { getPrisma } from "../database/prisma";
import { logger } from "../utils/logger";
import { asyncHandler } from "../middleware/async-handler";

/**
 * Liveness: process is up, no I/O.
 */
export function health(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}

/**
 * Readiness: Postgres and Redis must respond.
 */
export const ready = asyncHandler(async (_req: Request, res: Response) => {
  let postgres = false;
  let redis = false;

  try {
    await getPrisma().$queryRaw`SELECT 1`;
    postgres = true;
  } catch (error) {
    logger.warn({ err: error }, "Readiness check failed for Postgres");
  }

  try {
    const redisClient = getRedis();
    if (redisClient.status === "wait") {
      await redisClient.connect();
    }
    const pong = await redisClient.ping();
    redis = pong === "PONG";
  } catch (error) {
    logger.warn({ err: error }, "Readiness check failed for Redis");
  }

  const ok = postgres && redis;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ready" : "not_ready",
    postgres,
    redis,
  });
});
