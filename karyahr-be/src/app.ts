import cors from "cors";
import express from "express";
import type { Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { corsOrigins } from "./config/env";
import { createAuthRouter } from "./modules/auth/presentation/routes/auth.routes";
import { createEmployeeRouter } from "./modules/employees/presentation/routes/employees.routes";
import { createOrgRouter } from "./modules/organization/presentation/routes/org.routes";
import { createSystemRouter } from "./modules/system/presentation/routes/system.routes";
import { health, ready } from "./shared/health/health.controller";
import { cookieParser } from "./shared/middleware/cookie-parser";
import { errorHandler, getRequestId, notFoundHandler } from "./shared/middleware/error-handler";
import { logger } from "./shared/utils/logger";

/**
 * Builds the Express application with middleware and module routes.
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(express.json());
  app.use(cookieParser);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, _res) => getRequestId(req),
      customProps: (req) => ({ requestId: getRequestId(req) }),
    }),
  );

  app.get("/health", health);
  app.get("/ready", ready);
  app.use("/system", createSystemRouter());
  app.use(createAuthRouter());
  app.use(createOrgRouter());
  app.use(createEmployeeRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
