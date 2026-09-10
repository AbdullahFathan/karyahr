import { pingQuerySchema } from "./schemas/ping.schema";
import { operation, pathItem, queryParams } from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for the system module.
 */
export const systemOpenApiPaths: OpenApiPaths = {
  "/system/ping": pathItem({
    get: operation({
      tag: "System",
      summary: "Ping the system module",
      auth: false,
      parameters: queryParams(pingQuerySchema),
      successStatus: "200",
      successDescription: "Module is registered",
    }),
  }),
};
