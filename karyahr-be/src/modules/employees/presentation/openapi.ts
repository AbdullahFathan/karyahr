import {
  createChangeRequestSchema,
  createEmployeeSchema,
  createMutationSchema,
  documentTypeSchema,
  listChangeRequestsQuerySchema,
  listEmployeesQuerySchema,
  offboardEmployeeSchema,
  reviewChangeRequestSchema,
  updateEmployeeSchema,
} from "./schemas/employee.schema";
import {
  employeeDocPath,
  idPath,
  jsonBody,
  multipartBody,
  operation,
  pathItem,
  queryParams,
} from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";
import { z } from "zod";

/**
 * OpenAPI paths for employees, ESS, documents, mutations, and offboard.
 */
export const employeesOpenApiPaths: OpenApiPaths = {
  "/employees/me": pathItem({
    get: operation({
      tag: "Employees",
      summary: "Current employee profile",
      successStatus: "200",
      successDescription: "Own employee record",
    }),
  }),
  "/employees/me/change-requests": pathItem({
    get: operation({
      tag: "Employees",
      summary: "List own profile change requests",
      successStatus: "200",
      successDescription: "Change request list",
    }),
    post: operation({
      tag: "Employees",
      summary: "Submit a profile change request",
      requestBody: jsonBody(createChangeRequestSchema),
      successStatus: "201",
      successDescription: "Created change request",
    }),
  }),
  "/employees/change-requests": pathItem({
    get: operation({
      tag: "Employees",
      summary: "List profile change requests for HR review",
      parameters: queryParams(listChangeRequestsQuerySchema),
      successStatus: "200",
      successDescription: "Change request inbox",
    }),
  }),
  "/employees/change-requests/{id}/approve": pathItem({
    post: operation({
      tag: "Employees",
      summary: "Approve a profile change request",
      parameters: idPath,
      requestBody: jsonBody(reviewChangeRequestSchema, false),
      successStatus: "200",
      successDescription: "Approved request",
    }),
  }),
  "/employees/change-requests/{id}/reject": pathItem({
    post: operation({
      tag: "Employees",
      summary: "Reject a profile change request",
      parameters: idPath,
      requestBody: jsonBody(reviewChangeRequestSchema, false),
      successStatus: "200",
      successDescription: "Rejected request",
    }),
  }),
  "/employees": pathItem({
    get: operation({
      tag: "Employees",
      summary: "List employees",
      parameters: queryParams(listEmployeesQuerySchema),
      successStatus: "200",
      successDescription: "Paginated employee list",
    }),
    post: operation({
      tag: "Employees",
      summary: "Create employee",
      requestBody: jsonBody(createEmployeeSchema),
      successStatus: "201",
      successDescription: "Created employee",
    }),
  }),
  "/employees/{id}": pathItem({
    get: operation({
      tag: "Employees",
      summary: "Get employee by id",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Employee record",
    }),
    patch: operation({
      tag: "Employees",
      summary: "Update employee",
      parameters: idPath,
      requestBody: jsonBody(updateEmployeeSchema),
      successStatus: "200",
      successDescription: "Updated employee",
    }),
  }),
  "/employees/{id}/offboard": pathItem({
    post: operation({
      tag: "Employees",
      summary: "Offboard employee",
      description: "Sets status INACTIVE, disables the user, revokes sessions, and writes an audit snapshot.",
      parameters: idPath,
      requestBody: jsonBody(offboardEmployeeSchema, false),
      successStatus: "200",
      successDescription: "Offboarded employee",
    }),
  }),
  "/employees/{id}/mutations": pathItem({
    get: operation({
      tag: "Employees",
      summary: "List employee mutations",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Mutation history",
    }),
    post: operation({
      tag: "Employees",
      summary: "Create employee mutation",
      parameters: idPath,
      requestBody: jsonBody(createMutationSchema),
      successStatus: "201",
      successDescription: "Created mutation",
    }),
  }),
  "/employees/{id}/documents": pathItem({
    get: operation({
      tag: "Employees",
      summary: "List employee documents",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Document metadata list",
    }),
    post: operation({
      tag: "Employees",
      summary: "Upload employee document",
      parameters: idPath,
      requestBody: multipartBody(z.object({ type: documentTypeSchema }), {
        name: "file",
        required: true,
      }),
      successStatus: "201",
      successDescription: "Uploaded document metadata",
    }),
  }),
  "/employees/{id}/documents/{docId}/file": pathItem({
    get: operation({
      tag: "Employees",
      summary: "Download employee document file",
      parameters: employeeDocPath,
      successStatus: "200",
      successDescription: "Document bytes",
      successContent: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
    }),
  }),
  "/employees/{id}/documents/{docId}": pathItem({
    delete: operation({
      tag: "Employees",
      summary: "Delete employee document",
      parameters: employeeDocPath,
      successStatus: "204",
      successDescription: "Document deleted",
    }),
  }),
};
