import pino from "pino";
import { env } from "../../config/env";

/**
 * Shared application logger.
 */
export const logger = pino({
  level: env().LOG_LEVEL,
  base: { service: "karyahr-be" },
});
