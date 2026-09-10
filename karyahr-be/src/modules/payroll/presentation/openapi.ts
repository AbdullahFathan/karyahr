import {
  assignSalarySchema,
  createPayrollRunSchema,
  createSalaryComponentSchema,
  exportYearQuerySchema,
  paginationQuerySchema,
  payslipRangeQuerySchema,
  updateSalaryComponentSchema,
  upsertPayrollProfileSchema,
} from "./schemas/payroll.schema";
import {
  binaryContent,
  employeeIdPath,
  idPath,
  jsonBody,
  operation,
  pathItem,
  queryParams,
} from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for payroll catalog, runs, payslips, and exports.
 */
export const payrollOpenApiPaths: OpenApiPaths = {
  "/payroll/components": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "List salary components",
      successStatus: "200",
      successDescription: "Component list",
    }),
    post: operation({
      tag: "Payroll",
      summary: "Create salary component",
      requestBody: jsonBody(createSalaryComponentSchema),
      successStatus: "201",
      successDescription: "Created component",
    }),
  }),
  "/payroll/components/{id}": pathItem({
    patch: operation({
      tag: "Payroll",
      summary: "Update salary component",
      parameters: idPath,
      requestBody: jsonBody(updateSalaryComponentSchema),
      successStatus: "200",
      successDescription: "Updated component",
    }),
  }),
  "/payroll/profiles": pathItem({
    put: operation({
      tag: "Payroll",
      summary: "Upsert employee payroll profile",
      requestBody: jsonBody(upsertPayrollProfileSchema),
      successStatus: "200",
      successDescription: "Payroll profile",
    }),
  }),
  "/payroll/profiles/{employeeId}": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Get employee payroll profile",
      parameters: employeeIdPath,
      successStatus: "200",
      successDescription: "Payroll profile",
    }),
  }),
  "/payroll/assignments": pathItem({
    post: operation({
      tag: "Payroll",
      summary: "Assign salary component to employee",
      requestBody: jsonBody(assignSalarySchema),
      successStatus: "201",
      successDescription: "Created assignment",
    }),
  }),
  "/payroll/assignments/{employeeId}": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "List salary assignments for an employee",
      parameters: employeeIdPath,
      successStatus: "200",
      successDescription: "Assignment list",
    }),
  }),
  "/payroll/runs": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "List payroll runs",
      parameters: queryParams(paginationQuerySchema),
      successStatus: "200",
      successDescription: "Paginated runs",
    }),
    post: operation({
      tag: "Payroll",
      summary: "Queue a payroll run",
      requestBody: jsonBody(createPayrollRunSchema),
      successStatus: "202",
      successDescription: "Queued run",
    }),
  }),
  "/payroll/runs/{id}": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Get payroll run",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Run record",
    }),
  }),
  "/payroll/runs/{id}/payslips": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "List payslips for a run",
      parameters: [...idPath, ...queryParams(paginationQuerySchema)],
      successStatus: "200",
      successDescription: "Paginated payslips",
    }),
  }),
  "/payroll/runs/{id}/exports/accounting": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Accounting payroll export",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Export file",
      successContent: binaryContent("text/csv"),
    }),
  }),
  "/payroll/runs/{id}/exports/pph21": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Monthly PPh 21 export",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Export file",
      successContent: binaryContent("text/csv"),
    }),
  }),
  "/payroll/runs/{id}/exports/1721-a1": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "1721-A1 export",
      parameters: [...idPath, ...queryParams(exportYearQuerySchema)],
      successStatus: "200",
      successDescription: "Export file",
      successContent: binaryContent("text/csv"),
    }),
  }),
  "/payroll/runs/{id}/exports/bank": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Bank transfer file",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Bank file",
      successContent: binaryContent("text/csv"),
    }),
  }),
  "/payslips/me": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Own payslips",
      parameters: queryParams(payslipRangeQuerySchema),
      successStatus: "200",
      successDescription: "Paginated payslips",
    }),
  }),
  "/payslips/{id}": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Get payslip",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Payslip record",
    }),
  }),
  "/payslips/{id}/pdf": pathItem({
    get: operation({
      tag: "Payroll",
      summary: "Download payslip PDF",
      parameters: idPath,
      successStatus: "200",
      successDescription: "PDF file",
      successContent: binaryContent("application/pdf"),
    }),
  }),
};
