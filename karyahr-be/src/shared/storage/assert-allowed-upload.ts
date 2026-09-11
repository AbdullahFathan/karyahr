import { ValidationError } from "../errors/app-error";

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

/**
 * Rejects uploads whose declared content type is outside the HR document allowlist.
 */
export function assertAllowedUpload(contentType: string): void {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_CONTENT_TYPES.has(normalized)) {
    throw new ValidationError("File type is not allowed");
  }
}
