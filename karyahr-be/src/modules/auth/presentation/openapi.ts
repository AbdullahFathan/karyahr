import { loginSchema } from "./schemas/login.schema";
import {
  createPermissionSchema,
  createRoleSchema,
  setRolePermissionsSchema,
  updateRoleSchema,
} from "./schemas/role.schema";
import {
  idPath,
  jsonBody,
  operation,
  pathItem,
} from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for auth, roles, and permissions.
 */
export const authOpenApiPaths: OpenApiPaths = {
  "/auth/login": pathItem({
    post: operation({
      tag: "Auth",
      summary: "Log in and set access/refresh cookies",
      description:
        "Sets HttpOnly cookies `access_token` and `refresh_token`. Use the same origin for subsequent authenticated Try it out calls.",
      auth: false,
      requestBody: jsonBody(loginSchema),
      successStatus: "200",
      successDescription: "Authenticated user summary",
    }),
  }),
  "/auth/refresh": pathItem({
    post: operation({
      tag: "Auth",
      summary: "Rotate session using refresh cookie",
      auth: false,
      successStatus: "204",
      successDescription: "Cookies rotated",
    }),
  }),
  "/auth/logout": pathItem({
    post: operation({
      tag: "Auth",
      summary: "Revoke refresh token and clear cookies",
      auth: false,
      successStatus: "204",
      successDescription: "Logged out",
    }),
  }),
  "/auth/me": pathItem({
    get: operation({
      tag: "Auth",
      summary: "Current user and employee profile",
      successStatus: "200",
      successDescription: "Session identity",
    }),
  }),
  "/roles": pathItem({
    get: operation({
      tag: "Auth",
      summary: "List roles",
      successStatus: "200",
      successDescription: "Role list",
    }),
    post: operation({
      tag: "Auth",
      summary: "Create role",
      requestBody: jsonBody(createRoleSchema),
      successStatus: "201",
      successDescription: "Created role",
    }),
  }),
  "/roles/{id}": pathItem({
    patch: operation({
      tag: "Auth",
      summary: "Update role",
      parameters: idPath,
      requestBody: jsonBody(updateRoleSchema),
      successStatus: "200",
      successDescription: "Updated role",
    }),
    delete: operation({
      tag: "Auth",
      summary: "Delete role",
      parameters: idPath,
      successStatus: "204",
      successDescription: "Role deleted",
    }),
  }),
  "/roles/{id}/permissions": pathItem({
    put: operation({
      tag: "Auth",
      summary: "Replace role permissions",
      parameters: idPath,
      requestBody: jsonBody(setRolePermissionsSchema),
      successStatus: "200",
      successDescription: "Updated role permissions",
    }),
  }),
  "/permissions": pathItem({
    get: operation({
      tag: "Auth",
      summary: "List permissions",
      successStatus: "200",
      successDescription: "Permission catalog",
    }),
    post: operation({
      tag: "Auth",
      summary: "Create permission",
      requestBody: jsonBody(createPermissionSchema),
      successStatus: "201",
      successDescription: "Created permission",
    }),
  }),
};
