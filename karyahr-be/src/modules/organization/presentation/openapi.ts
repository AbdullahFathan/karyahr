import {
  createDepartmentSchema,
  createPositionSchema,
  orgTreeQuerySchema,
  updateDepartmentSchema,
  updatePositionSchema,
} from "./schemas/org.schema";
import {
  idPath,
  jsonBody,
  operation,
  pathItem,
  queryParams,
} from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for departments, positions, and org tree.
 */
export const orgOpenApiPaths: OpenApiPaths = {
  "/org/tree": pathItem({
    get: operation({
      tag: "Organization",
      summary: "Nested organization tree",
      parameters: queryParams(orgTreeQuerySchema),
      successStatus: "200",
      successDescription: "Org tree JSON",
    }),
  }),
  "/departments": pathItem({
    get: operation({
      tag: "Organization",
      summary: "List departments",
      successStatus: "200",
      successDescription: "Department list",
    }),
    post: operation({
      tag: "Organization",
      summary: "Create department",
      requestBody: jsonBody(createDepartmentSchema),
      successStatus: "201",
      successDescription: "Created department",
    }),
  }),
  "/departments/{id}": pathItem({
    patch: operation({
      tag: "Organization",
      summary: "Update department",
      parameters: idPath,
      requestBody: jsonBody(updateDepartmentSchema),
      successStatus: "200",
      successDescription: "Updated department",
    }),
    delete: operation({
      tag: "Organization",
      summary: "Delete department",
      parameters: idPath,
      successStatus: "204",
      successDescription: "Department deleted",
    }),
  }),
  "/positions": pathItem({
    get: operation({
      tag: "Organization",
      summary: "List positions",
      successStatus: "200",
      successDescription: "Position list",
    }),
    post: operation({
      tag: "Organization",
      summary: "Create position",
      requestBody: jsonBody(createPositionSchema),
      successStatus: "201",
      successDescription: "Created position",
    }),
  }),
  "/positions/{id}": pathItem({
    patch: operation({
      tag: "Organization",
      summary: "Update position",
      parameters: idPath,
      requestBody: jsonBody(updatePositionSchema),
      successStatus: "200",
      successDescription: "Updated position",
    }),
    delete: operation({
      tag: "Organization",
      summary: "Delete position",
      parameters: idPath,
      successStatus: "204",
      successDescription: "Position deleted",
    }),
  }),
};
