import {
  assignPeersSchema,
  createCycleSchema,
  createGoalSchema,
  dashboardQuerySchema,
  listGoalsQuerySchema,
  submitRatingSchema,
  updateCycleSchema,
  updateGoalSchema,
  updateProgressSchema,
} from "./schemas/performance.schema";
import {
  employeeIdPath,
  idPath,
  jsonBody,
  operation,
  pathItem,
  queryParams,
} from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for goals, review cycles, and performance dashboards.
 */
export const performanceOpenApiPaths: OpenApiPaths = {
  "/performance/goals": pathItem({
    get: operation({
      tag: "Performance",
      summary: "List goals",
      parameters: queryParams(listGoalsQuerySchema),
      successStatus: "200",
      successDescription: "Paginated goals",
    }),
    post: operation({
      tag: "Performance",
      summary: "Create goal",
      requestBody: jsonBody(createGoalSchema),
      successStatus: "201",
      successDescription: "Created goal",
    }),
  }),
  "/performance/goals/me": pathItem({
    get: operation({
      tag: "Performance",
      summary: "Own goals",
      parameters: queryParams(listGoalsQuerySchema),
      successStatus: "200",
      successDescription: "Paginated goals",
    }),
  }),
  "/performance/goals/{id}": pathItem({
    get: operation({
      tag: "Performance",
      summary: "Get goal",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Goal record",
    }),
    patch: operation({
      tag: "Performance",
      summary: "Update goal",
      parameters: idPath,
      requestBody: jsonBody(updateGoalSchema),
      successStatus: "200",
      successDescription: "Updated goal",
    }),
  }),
  "/performance/goals/{id}/progress": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Update goal progress",
      parameters: idPath,
      requestBody: jsonBody(updateProgressSchema),
      successStatus: "200",
      successDescription: "Updated goal",
    }),
  }),
  "/performance/goals/{id}/submit": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Submit goal for approval",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Submitted goal",
    }),
  }),
  "/performance/goals/{id}/approve": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Approve goal",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Approved goal",
    }),
  }),
  "/performance/goals/{id}/reject": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Reject goal",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Rejected goal",
    }),
  }),
  "/performance/goals/{id}/complete": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Complete goal",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Completed goal",
    }),
  }),
  "/performance/goals/{id}/cancel": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Cancel goal",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Cancelled goal",
    }),
  }),
  "/performance/cycles": pathItem({
    get: operation({
      tag: "Performance",
      summary: "List review cycles",
      successStatus: "200",
      successDescription: "Cycle list",
    }),
    post: operation({
      tag: "Performance",
      summary: "Create review cycle",
      requestBody: jsonBody(createCycleSchema),
      successStatus: "201",
      successDescription: "Created cycle",
    }),
  }),
  "/performance/cycles/{id}": pathItem({
    get: operation({
      tag: "Performance",
      summary: "Get review cycle",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Cycle record",
    }),
    patch: operation({
      tag: "Performance",
      summary: "Update review cycle",
      parameters: idPath,
      requestBody: jsonBody(updateCycleSchema),
      successStatus: "200",
      successDescription: "Updated cycle",
    }),
  }),
  "/performance/cycles/{id}/open": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Open review cycle",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Opened cycle",
    }),
  }),
  "/performance/cycles/{id}/lock": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Lock review cycle",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Locked cycle",
    }),
  }),
  "/performance/reviews/me": pathItem({
    get: operation({
      tag: "Performance",
      summary: "Own performance reviews",
      successStatus: "200",
      successDescription: "Review list",
    }),
  }),
  "/performance/reviews/{id}": pathItem({
    get: operation({
      tag: "Performance",
      summary: "Get performance review",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Review record",
    }),
  }),
  "/performance/reviews/{id}/peers": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Assign peer reviewers",
      parameters: idPath,
      requestBody: jsonBody(assignPeersSchema),
      successStatus: "200",
      successDescription: "Updated review",
    }),
  }),
  "/performance/reviews/{id}/ratings": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Submit a review rating",
      parameters: idPath,
      requestBody: jsonBody(submitRatingSchema),
      successStatus: "200",
      successDescription: "Updated review",
    }),
  }),
  "/performance/reviews/{id}/complete": pathItem({
    post: operation({
      tag: "Performance",
      summary: "Complete performance review",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Completed review",
    }),
  }),
  "/performance/employees/{employeeId}/reviews": pathItem({
    get: operation({
      tag: "Performance",
      summary: "List reviews for an employee",
      parameters: employeeIdPath,
      successStatus: "200",
      successDescription: "Review history",
    }),
  }),
  "/performance/dashboard/team": pathItem({
    get: operation({
      tag: "Performance",
      summary: "Team score distribution",
      parameters: queryParams(dashboardQuerySchema),
      successStatus: "200",
      successDescription: "Team dashboard",
    }),
  }),
  "/performance/dashboard/heatmap": pathItem({
    get: operation({
      tag: "Performance",
      summary: "Department performance heatmap",
      parameters: queryParams(dashboardQuerySchema),
      successStatus: "200",
      successDescription: "Heatmap payload",
    }),
  }),
};
