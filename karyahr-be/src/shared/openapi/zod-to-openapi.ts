import { z } from "zod";
import type { JsonSchemaObject } from "./types";

/**
 * Converts a Zod schema into an OpenAPI 3.0 Schema Object.
 */
export function zodToOpenApi(schema: z.ZodType): JsonSchemaObject {
  const json = z.toJSONSchema(schema, {
    target: "openapi-3.0",
    unrepresentable: "any",
  }) as JsonSchemaObject;
  const { $schema: _schema, ...rest } = json;
  return rest;
}
