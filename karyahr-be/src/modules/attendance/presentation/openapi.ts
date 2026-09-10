import {
  assignShiftSchema,
  attendanceDashboardQuerySchema,
  attendanceRangeQuerySchema,
  attendanceSummaryQuerySchema,
  createShiftSchema,
  updateShiftSchema,
} from "./schemas/attendance.schema";
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
 * OpenAPI paths for attendance punches, shifts, and reports.
 */
export const attendanceOpenApiPaths: OpenApiPaths = {
  "/attendance/check-in": pathItem({
    post: operation({
      tag: "Attendance",
      summary: "Check in (server time)",
      successStatus: "200",
      successDescription: "Open attendance record",
    }),
  }),
  "/attendance/check-out": pathItem({
    post: operation({
      tag: "Attendance",
      summary: "Check out (server time)",
      successStatus: "200",
      successDescription: "Closed attendance record",
    }),
  }),
  "/attendance/me": pathItem({
    get: operation({
      tag: "Attendance",
      summary: "Own attendance records in a date range",
      parameters: queryParams(attendanceRangeQuerySchema),
      successStatus: "200",
      successDescription: "Attendance list",
    }),
  }),
  "/attendance/summary": pathItem({
    get: operation({
      tag: "Attendance",
      summary: "Attendance summary",
      parameters: queryParams(attendanceSummaryQuerySchema),
      successStatus: "200",
      successDescription: "Summary payload",
    }),
  }),
  "/attendance/dashboard": pathItem({
    get: operation({
      tag: "Attendance",
      summary: "Supervisor attendance dashboard",
      parameters: queryParams(attendanceDashboardQuerySchema),
      successStatus: "200",
      successDescription: "Dashboard payload",
    }),
  }),
  "/attendance/export": pathItem({
    get: operation({
      tag: "Attendance",
      summary: "Export attendance CSV",
      parameters: queryParams(attendanceRangeQuerySchema),
      successStatus: "200",
      successDescription: "CSV file",
      successContent: binaryContent("text/csv"),
    }),
  }),
  "/attendance/shifts": pathItem({
    get: operation({
      tag: "Attendance",
      summary: "List shifts",
      successStatus: "200",
      successDescription: "Shift list",
    }),
    post: operation({
      tag: "Attendance",
      summary: "Create shift",
      requestBody: jsonBody(createShiftSchema),
      successStatus: "201",
      successDescription: "Created shift",
    }),
  }),
  "/attendance/shifts/{id}": pathItem({
    get: operation({
      tag: "Attendance",
      summary: "Get shift",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Shift record",
    }),
    patch: operation({
      tag: "Attendance",
      summary: "Update shift",
      parameters: idPath,
      requestBody: jsonBody(updateShiftSchema),
      successStatus: "200",
      successDescription: "Updated shift",
    }),
  }),
  "/attendance/shifts/{id}/assignments": pathItem({
    post: operation({
      tag: "Attendance",
      summary: "Assign shift to employee",
      parameters: idPath,
      requestBody: jsonBody(assignShiftSchema),
      successStatus: "201",
      successDescription: "Created assignment",
    }),
  }),
  "/attendance/employees/{employeeId}/assignments": pathItem({
    get: operation({
      tag: "Attendance",
      summary: "List shift assignments for an employee",
      parameters: employeeIdPath,
      successStatus: "200",
      successDescription: "Assignment list",
    }),
  }),
};
