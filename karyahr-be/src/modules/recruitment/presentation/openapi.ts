import {
  addNoteSchema,
  applySchema,
  createJobPostingSchema,
  createOnboardingItemSchema,
  createOnboardingTemplateSchema,
  hireCandidateSchema,
  listJobsQuerySchema,
  moveStageSchema,
  replaceStagesSchema,
  updateJobPostingSchema,
  updateOnboardingItemSchema,
  updateOnboardingTemplateSchema,
} from "./schemas/recruitment.schema";
import {
  employeeIdPath,
  idPath,
  jsonBody,
  multipartBody,
  operation,
  pathItem,
  queryParams,
  slugPath,
} from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for public careers, ATS, and onboarding.
 */
export const recruitmentOpenApiPaths: OpenApiPaths = {
  "/careers": pathItem({
    get: operation({
      tag: "Recruitment",
      summary: "List public job postings",
      auth: false,
      successStatus: "200",
      successDescription: "Open careers",
    }),
  }),
  "/careers/{slug}": pathItem({
    get: operation({
      tag: "Recruitment",
      summary: "Get public job posting",
      auth: false,
      parameters: slugPath,
      successStatus: "200",
      successDescription: "Career detail",
    }),
  }),
  "/careers/{slug}/apply": pathItem({
    post: operation({
      tag: "Recruitment",
      summary: "Apply to a public job posting",
      auth: false,
      parameters: slugPath,
      requestBody: multipartBody(applySchema, { name: "file", required: false }),
      successStatus: "201",
      successDescription: "Created application",
    }),
  }),
  "/recruitment/jobs": pathItem({
    get: operation({
      tag: "Recruitment",
      summary: "List job postings",
      parameters: queryParams(listJobsQuerySchema),
      successStatus: "200",
      successDescription: "Paginated jobs",
    }),
    post: operation({
      tag: "Recruitment",
      summary: "Create job posting",
      requestBody: jsonBody(createJobPostingSchema),
      successStatus: "201",
      successDescription: "Created job",
    }),
  }),
  "/recruitment/jobs/{id}": pathItem({
    get: operation({
      tag: "Recruitment",
      summary: "Get job posting",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Job posting",
    }),
    patch: operation({
      tag: "Recruitment",
      summary: "Update job posting",
      parameters: idPath,
      requestBody: jsonBody(updateJobPostingSchema),
      successStatus: "200",
      successDescription: "Updated job",
    }),
  }),
  "/recruitment/jobs/{id}/stages": pathItem({
    put: operation({
      tag: "Recruitment",
      summary: "Replace pipeline stages",
      parameters: idPath,
      requestBody: jsonBody(replaceStagesSchema),
      successStatus: "200",
      successDescription: "Updated stages",
    }),
  }),
  "/recruitment/jobs/{id}/applications": pathItem({
    get: operation({
      tag: "Recruitment",
      summary: "List applications for a job",
      parameters: [...idPath, ...queryParams(listJobsQuerySchema)],
      successStatus: "200",
      successDescription: "Paginated applications",
    }),
  }),
  "/recruitment/applications": pathItem({
    post: operation({
      tag: "Recruitment",
      summary: "Create application as HR",
      requestBody: multipartBody(applySchema, { name: "file", required: false }),
      successStatus: "201",
      successDescription: "Created application",
    }),
  }),
  "/recruitment/applications/{id}": pathItem({
    get: operation({
      tag: "Recruitment",
      summary: "Get application",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Application detail",
    }),
  }),
  "/recruitment/applications/{id}/stage": pathItem({
    post: operation({
      tag: "Recruitment",
      summary: "Move application to a stage",
      parameters: idPath,
      requestBody: jsonBody(moveStageSchema),
      successStatus: "200",
      successDescription: "Updated application",
    }),
  }),
  "/recruitment/applications/{id}/notes": pathItem({
    post: operation({
      tag: "Recruitment",
      summary: "Add application note or rating",
      parameters: idPath,
      requestBody: jsonBody(addNoteSchema),
      successStatus: "201",
      successDescription: "Created note",
    }),
  }),
  "/recruitment/applications/{id}/reject": pathItem({
    post: operation({
      tag: "Recruitment",
      summary: "Reject application",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Rejected application",
    }),
  }),
  "/recruitment/applications/{id}/hire": pathItem({
    post: operation({
      tag: "Recruitment",
      summary: "Convert accepted candidate to employee",
      parameters: idPath,
      requestBody: jsonBody(hireCandidateSchema),
      successStatus: "201",
      successDescription: "Hired employee",
    }),
  }),
  "/onboarding/templates": pathItem({
    get: operation({
      tag: "Onboarding",
      summary: "List onboarding templates",
      successStatus: "200",
      successDescription: "Template list",
    }),
    post: operation({
      tag: "Onboarding",
      summary: "Create onboarding template",
      requestBody: jsonBody(createOnboardingTemplateSchema),
      successStatus: "201",
      successDescription: "Created template",
    }),
  }),
  "/onboarding/templates/{id}": pathItem({
    patch: operation({
      tag: "Onboarding",
      summary: "Update onboarding template",
      parameters: idPath,
      requestBody: jsonBody(updateOnboardingTemplateSchema),
      successStatus: "200",
      successDescription: "Updated template",
    }),
  }),
  "/onboarding/templates/{id}/items": pathItem({
    post: operation({
      tag: "Onboarding",
      summary: "Add template item",
      parameters: idPath,
      requestBody: jsonBody(createOnboardingItemSchema),
      successStatus: "201",
      successDescription: "Created item",
    }),
  }),
  "/onboarding/items/{id}": pathItem({
    patch: operation({
      tag: "Onboarding",
      summary: "Update template item",
      parameters: idPath,
      requestBody: jsonBody(updateOnboardingItemSchema),
      successStatus: "200",
      successDescription: "Updated item",
    }),
    delete: operation({
      tag: "Onboarding",
      summary: "Delete template item",
      parameters: idPath,
      successStatus: "204",
      successDescription: "Item deleted",
    }),
  }),
  "/onboarding/dashboard": pathItem({
    get: operation({
      tag: "Onboarding",
      summary: "Onboarding progress dashboard",
      parameters: queryParams(listJobsQuerySchema),
      successStatus: "200",
      successDescription: "Dashboard payload",
    }),
  }),
  "/onboarding/me": pathItem({
    get: operation({
      tag: "Onboarding",
      summary: "Own onboarding process",
      successStatus: "200",
      successDescription: "Onboarding process",
    }),
  }),
  "/onboarding/processes/{employeeId}": pathItem({
    get: operation({
      tag: "Onboarding",
      summary: "Get onboarding process by employee",
      parameters: employeeIdPath,
      successStatus: "200",
      successDescription: "Onboarding process",
    }),
  }),
  "/onboarding/tasks/{id}/complete": pathItem({
    post: operation({
      tag: "Onboarding",
      summary: "Complete an onboarding task",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Updated process",
    }),
  }),
};
