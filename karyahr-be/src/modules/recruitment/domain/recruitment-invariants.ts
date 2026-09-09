import { ConflictError, ValidationError } from "../../../shared/errors/app-error";
import type { JobPostingDetail } from "./entities/Recruitment";

/**
 * Builds a URL-safe slug from a job title.
 */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug.length > 0 ? slug : `job-${Date.now()}`;
}

/**
 * Rejects applies when the posting is closed, expired, or at quota.
 */
export function assertPostingAcceptsApplications(
  posting: JobPostingDetail,
  now: Date,
): void {
  if (posting.status !== "OPEN") {
    throw new ConflictError("Job posting is not open");
  }
  if (posting.closesAt && posting.closesAt.getTime() <= now.getTime()) {
    throw new ConflictError("Job posting has closed");
  }
  if (posting.applicationCount >= posting.maxApplicants) {
    throw new ConflictError("Applicant quota reached");
  }
}

/**
 * Validates an optional 1–5 rating.
 */
export function assertRating(rating: number | null | undefined): void {
  if (rating === null || rating === undefined) {
    return;
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError("Rating must be an integer from 1 to 5");
  }
}
