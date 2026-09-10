import { z } from "zod";
import { ACCESS_COOKIE } from "../auth/cookie-names";
import type {
  JsonSchemaObject,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiPaths,
  OpenApiRequestBody,
  OpenApiResponse,
} from "./types";
import { zodToOpenApi } from "./zod-to-openapi";

const ERROR_REF: JsonSchemaObject = { $ref: "#/components/schemas/Error" };

const JSON_OBJECT: JsonSchemaObject = {
  type: "object",
  additionalProperties: true,
};

export const cookieAuthScheme: JsonSchemaObject = {
  type: "apiKey",
  in: "cookie",
  name: ACCESS_COOKIE,
  description:
    "HttpOnly access cookie set by POST /auth/login. Swagger Authorize cannot set this cookie; call login first in the same origin, then Try it out with credentials.",
};

/**
 * Maps a Zod object schema to OpenAPI query parameters.
 */
export function queryParams(schema: z.ZodType): OpenApiParameter[] {
  return objectToParams(schema, "query");
}

/**
 * Maps a Zod object schema to OpenAPI path parameters.
 */
export function pathParams(schema: z.ZodType): OpenApiParameter[] {
  return objectToParams(schema, "path").map((parameter) => ({
    ...parameter,
    required: true,
  }));
}

export const idPath = pathParams(z.object({ id: z.string().min(1) }));
export const employeeIdPath = pathParams(z.object({ employeeId: z.string().min(1) }));
export const slugPath = pathParams(z.object({ slug: z.string().min(1) }));
export const employeeDocPath = pathParams(
  z.object({ id: z.string().min(1), docId: z.string().min(1) }),
);

/**
 * JSON request body from a Zod schema.
 */
export function jsonBody(schema: z.ZodType, required = true): OpenApiRequestBody {
  return {
    required,
    content: {
      "application/json": { schema: zodToOpenApi(schema) },
    },
  };
}

/**
 * Multipart body: Zod fields plus an optional file part named `file` by default.
 */
export function multipartBody(
  schema: z.ZodType,
  file: { readonly name: string; readonly required: boolean } = {
    name: "file",
    required: false,
  },
): OpenApiRequestBody {
  const json = zodToOpenApi(schema);
  const properties: Record<string, JsonSchemaObject> = {
    ...((json.properties as Record<string, JsonSchemaObject> | undefined) ?? {}),
    [file.name]: { type: "string", format: "binary" },
  };
  const required = [...((json.required as string[] | undefined) ?? [])];
  if (file.required) {
    required.push(file.name);
  }
  return {
    required: true,
    content: {
      "multipart/form-data": {
        schema: {
          type: "object",
          properties,
          required: required.length > 0 ? required : undefined,
        },
      },
    },
  };
}

export function jsonObjectContent(): Record<string, { schema: JsonSchemaObject }> {
  return { "application/json": { schema: JSON_OBJECT } };
}

export function binaryContent(
  mediaType: string,
): Record<string, { schema: JsonSchemaObject }> {
  return { [mediaType]: { schema: { type: "string", format: "binary" } } };
}

export function errorResponses(authenticated: boolean): Record<string, OpenApiResponse> {
  const content = { "application/json": { schema: ERROR_REF } };
  const responses: Record<string, OpenApiResponse> = {
    "400": { description: "Validation error", content },
    "404": { description: "Not found", content },
    "409": { description: "Conflict", content },
    "500": { description: "Internal error", content },
  };
  if (authenticated) {
    responses["401"] = { description: "Unauthorized", content };
    responses["403"] = { description: "Forbidden", content };
  }
  return responses;
}

export function operation(input: {
  readonly tag: string;
  readonly summary: string;
  readonly description?: string;
  readonly auth?: boolean;
  readonly parameters?: readonly OpenApiParameter[];
  readonly requestBody?: OpenApiRequestBody;
  readonly successStatus: string;
  readonly successDescription: string;
  readonly successContent?: Record<string, { schema: JsonSchemaObject }>;
}): OpenApiOperation {
  const authenticated = input.auth !== false;
  const isNoContent = input.successStatus === "204";
  return {
    tags: [input.tag],
    summary: input.summary,
    description: input.description,
    security: authenticated ? [{ cookieAuth: [] }] : [],
    parameters: input.parameters,
    requestBody: input.requestBody,
    responses: {
      [input.successStatus]: {
        description: input.successDescription,
        content: isNoContent ? undefined : (input.successContent ?? jsonObjectContent()),
      },
      ...errorResponses(authenticated),
    },
  };
}

/**
 * Merges path items from multiple modules.
 */
export function mergePaths(...groups: OpenApiPaths[]): OpenApiPaths {
  const out: OpenApiPaths = {};
  for (const group of groups) {
    for (const [path, item] of Object.entries(group)) {
      const existing = out[path];
      out[path] = existing ? { ...existing, ...item } : item;
    }
  }
  return out;
}

export function pathItem(methods: OpenApiPathItem): OpenApiPathItem {
  return methods;
}

function objectToParams(
  schema: z.ZodType,
  location: "query" | "path",
): OpenApiParameter[] {
  const json = zodToOpenApi(schema);
  const properties =
    (json.properties as Record<string, JsonSchemaObject> | undefined) ?? {};
  const required = new Set((json.required as string[] | undefined) ?? []);
  return Object.entries(properties).map(([name, propertySchema]) => ({
    name,
    in: location,
    required: required.has(name),
    schema: propertySchema,
  }));
}
