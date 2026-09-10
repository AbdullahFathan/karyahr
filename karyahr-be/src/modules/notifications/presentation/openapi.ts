import { idPath, operation, pathItem } from "../../../shared/openapi/helpers";
import type { OpenApiPaths } from "../../../shared/openapi/types";

/**
 * OpenAPI paths for in-app notifications.
 */
export const notificationsOpenApiPaths: OpenApiPaths = {
  "/notifications/me": pathItem({
    get: operation({
      tag: "Notifications",
      summary: "Own in-app notifications",
      successStatus: "200",
      successDescription: "Notification list",
    }),
  }),
  "/notifications/{id}/read": pathItem({
    patch: operation({
      tag: "Notifications",
      summary: "Mark notification as read",
      parameters: idPath,
      successStatus: "200",
      successDescription: "Updated notification",
    }),
  }),
};
