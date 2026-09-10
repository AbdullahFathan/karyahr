import {
  createLeavePolicySchema,
  createLeaveRequestSchema,
  createLeaveTypeSchema,
  paginationQuerySchema,
  reviewLeaveSchema,
  updateLeavePolicySchema,
  updateLeaveTypeSchema,
} from "./schemas/leave.schema";
import {
  idPath,
  jsonBody,
  multipartBody,
  operation,
  pathItem,
  queryParams,
} from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for leave types, policies, balances, and requests.
 */
export const leaveOpenApiPaths: OpenApiPaths = {
  "/leave/types": pathItem({
    get: operation({
      tag: "Leave",
      summary: "List leave types",
      successStatus: "200",
      successDescription: "Leave type list",
    }),
    post: operation({
      tag: "Leave",
      summary: "Create leave type",
      requestBody: jsonBody(createLeaveTypeSchema),
      successStatus: "201",
      successDescription: "Created leave type",
    }),
  }),
  "/leave/types/{id}": pathItem({
    patch: operation({
      tag: "Leave",
      summary: "Update leave type",
      parameters: idPath,
      requestBody: jsonBody(updateLeaveTypeSchema),
      successStatus: "200",
      successDescription: "Updated leave type",
    }),
  }),
  "/leave/policies": pathItem({
    get: operation({
      tag: "Leave",
      summary: "List leave policies",
      successStatus: "200",
      successDescription: "Policy list",
    }),
    post: operation({
      tag: "Leave",
      summary: "Create leave policy",
      requestBody: jsonBody(createLeavePolicySchema),
      successStatus: "201",
      successDescription: "Created policy",
    }),
  }),
  "/leave/policies/{id}": pathItem({
    patch: operation({
      tag: "Leave",
      summary: "Update leave policy",
      parameters: idPath,
      requestBody: jsonBody(updateLeavePolicySchema),
      successStatus: "200",
      successDescription: "Updated policy",
    }),
  }),
  "/leave/balances/me": pathItem({
    get: operation({
      tag: "Leave",
      summary: "Own leave balances",
      successStatus: "200",
      successDescription: "Balance list",
    }),
  }),
  "/leave/requests/me": pathItem({
    get: operation({
      tag: "Leave",
      summary: "Own leave requests",
      parameters: queryParams(paginationQuerySchema),
      successStatus: "200",
      successDescription: "Paginated requests",
    }),
  }),
  "/leave/requests": pathItem({
    get: operation({
      tag: "Leave",
      summary: "Leave approval inbox",
      parameters: queryParams(paginationQuerySchema),
      successStatus: "200",
      successDescription: "Paginated inbox",
    }),
    post: operation({
      tag: "Leave",
      summary: "Submit leave request",
      requestBody: multipartBody(createLeaveRequestSchema, { name: "file", required: false }),
      successStatus: "201",
      successDescription: "Created request",
    }),
  }),
  "/leave/requests/{id}/approve": pathItem({
    post: operation({
      tag: "Leave",
      summary: "Approve leave request",
      parameters: idPath,
      requestBody: jsonBody(reviewLeaveSchema, false),
      successStatus: "200",
      successDescription: "Approved request",
    }),
  }),
  "/leave/requests/{id}/reject": pathItem({
    post: operation({
      tag: "Leave",
      summary: "Reject leave request",
      parameters: idPath,
      requestBody: jsonBody(reviewLeaveSchema, false),
      successStatus: "200",
      successDescription: "Rejected request",
    }),
  }),
};
