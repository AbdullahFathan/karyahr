import { attendanceOpenApiPaths } from "../../modules/attendance/presentation/openapi";
import { authOpenApiPaths } from "../../modules/auth/presentation/openapi";
import { employeesOpenApiPaths } from "../../modules/employees/presentation/openapi";
import { leaveOpenApiPaths } from "../../modules/leave/presentation/openapi";
import { notificationsOpenApiPaths } from "../../modules/notifications/presentation/openapi";
import { orgOpenApiPaths } from "../../modules/organization/presentation/openapi";
import { payrollOpenApiPaths } from "../../modules/payroll/presentation/openapi";
import { performanceOpenApiPaths } from "../../modules/performance/presentation/openapi";
import { recruitmentOpenApiPaths } from "../../modules/recruitment/presentation/openapi";
import { systemOpenApiPaths } from "../../modules/system/presentation/openapi";
import { errorResponseSchema } from "./error.schema";
import { healthOpenApiPaths } from "./health.paths";
import { cookieAuthScheme, mergePaths } from "./helpers";
import type { OpenApiDocument } from "./types";
import { zodToOpenApi } from "./zod-to-openapi";

/**
 * Builds the generated OpenAPI 3.0 document from Zod schemas and route registries.
 */
export function buildOpenApiDocument(): OpenApiDocument {
  return {
    openapi: "3.0.3",
    info: {
      title: "KaryaHR API",
      version: "1.0.0",
      description:
        "HTTP contract for KaryaHR. Authenticated routes use the HttpOnly `access_token` cookie from POST /auth/login. Errors use `{ error, message, requestId }`.",
    },
    tags: [
      { name: "System", description: "Health and ping" },
      { name: "Auth", description: "Session, roles, and permissions" },
      { name: "Organization", description: "Departments, positions, org tree" },
      { name: "Employees", description: "Employee master, ESS, documents, offboard" },
      { name: "Attendance", description: "Check-in/out, shifts, recap" },
      { name: "Leave", description: "Leave types, policies, requests" },
      { name: "Notifications", description: "In-app notifications" },
      { name: "Payroll", description: "Components, runs, payslips, exports" },
      { name: "Recruitment", description: "ATS and public careers" },
      { name: "Onboarding", description: "Digital onboarding" },
      { name: "Performance", description: "OKR/KPI, reviews, dashboards" },
    ],
    paths: mergePaths(
      healthOpenApiPaths,
      systemOpenApiPaths,
      authOpenApiPaths,
      orgOpenApiPaths,
      employeesOpenApiPaths,
      attendanceOpenApiPaths,
      leaveOpenApiPaths,
      notificationsOpenApiPaths,
      payrollOpenApiPaths,
      recruitmentOpenApiPaths,
      performanceOpenApiPaths,
    ),
    components: {
      securitySchemes: {
        cookieAuth: cookieAuthScheme,
      },
      schemas: {
        Error: zodToOpenApi(errorResponseSchema),
      },
    },
  };
}
