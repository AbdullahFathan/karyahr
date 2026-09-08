import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { NotFoundError, mapError } from "../errors/app-error";
import { logger } from "../utils/logger";

const REQUEST_ID_HEADER = "x-request-id";

type RequestIdCarrier = {
  readonly headers: IncomingHttpHeaders;
  readonly id?: unknown;
};

/**
 * Reads or assigns a request id on the incoming request.
 */
export function getRequestId(req: RequestIdCarrier): string {
  if (typeof req.id === "string" && req.id.length > 0) {
    return req.id;
  }
  const header = req.headers[REQUEST_ID_HEADER];
  const existing = Array.isArray(header) ? header[0] : header;
  if (existing && existing.trim().length > 0) {
    return existing;
  }
  return randomUUID();
}

/**
 * Express 404 handler for unmatched routes.
 */
export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundError("Route not found"));
}

/**
 * Central error handler. Sends JSON `{ error, message, requestId }`.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = getRequestId(req);
  const mapped = mapError(error, requestId);

  if (mapped.statusCode >= 500) {
    logger.error({ err: error, requestId }, "Unhandled error");
  }

  res.setHeader("X-Request-Id", requestId);
  res.status(mapped.statusCode).json(mapped.body);
};
