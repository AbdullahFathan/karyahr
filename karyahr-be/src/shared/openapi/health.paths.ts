import { operation, pathItem } from "./helpers";
import type { OpenApiPaths } from "./types";

/**
 * OpenAPI paths for process liveness and readiness.
 */
export const healthOpenApiPaths: OpenApiPaths = {
  "/health": pathItem({
    get: operation({
      tag: "System",
      summary: "Liveness probe",
      auth: false,
      successStatus: "200",
      successDescription: "Process is up",
    }),
  }),
  "/ready": pathItem({
    get: operation({
      tag: "System",
      summary: "Readiness probe (Postgres + Redis)",
      auth: false,
      successStatus: "200",
      successDescription: "Dependencies are ready",
    }),
  }),
};
