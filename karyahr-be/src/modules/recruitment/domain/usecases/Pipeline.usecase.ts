import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { ApplicationDetail, ApplicationNote } from "../entities/Recruitment";
import { assertRating } from "../recruitment-invariants";
import type {
  IApplicationNoteRepository,
  IApplicationRepository,
  IJobPostingRepository,
} from "../repositories/IRecruitmentRepository";

/**
 * Lists applications for a job posting.
 */
export class ListApplicationsUseCase {
  constructor(private readonly applications: IApplicationRepository) {}

  execute(
    jobPostingId: string,
    pagination: import("../../../../shared/utils/pagination").PaginationParams,
  ) {
    return this.applications.listByJob(jobPostingId, pagination);
  }
}

/**
 * Loads one application with candidate, notes, and attachments.
 */
export class GetApplicationUseCase {
  constructor(private readonly applications: IApplicationRepository) {}

  async execute(id: string): Promise<ApplicationDetail> {
    const item = await this.applications.findById(id);
    if (!item) {
      throw new NotFoundError("Application not found");
    }
    return item;
  }
}

/**
 * Moves an application to another stage on the same posting.
 */
export class MoveApplicationStageUseCase {
  constructor(
    private readonly jobs: IJobPostingRepository,
    private readonly applications: IApplicationRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(applicationId: string, stageId: string, actorUserId: string): Promise<ApplicationDetail> {
    const current = await this.applications.findById(applicationId);
    if (!current) {
      throw new NotFoundError("Application not found");
    }
    if (current.status !== "ACTIVE") {
      throw new ConflictError("Only active applications can change stage");
    }
    const posting = await this.jobs.findById(current.jobPostingId);
    if (!posting) {
      throw new NotFoundError("Job posting not found");
    }
    const stage = posting.stages.find((item) => item.id === stageId);
    if (!stage) {
      throw new ValidationError("Stage does not belong to this job posting");
    }
    const updated = await this.applications.updateStage(applicationId, stageId);
    await this.dispatcher.dispatch({
      type: "recruitment.stage_changed",
      recipientEmail: updated.candidate.email,
      title: `Application update: ${posting.title}`,
      body: `Your application for ${posting.title} moved to ${stage.name}.`,
      entityType: "Application",
      entityId: updated.id,
    });
    await this.audit.append({
      actorUserId,
      entityType: "Application",
      entityId: updated.id,
      action: "move_stage",
      metadata: { stageId },
    });
    return updated;
  }
}

/**
 * Adds a recruiter note and optional rating.
 */
export class AddApplicationNoteUseCase {
  constructor(
    private readonly applications: IApplicationRepository,
    private readonly notes: IApplicationNoteRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    applicationId: string,
    input: { readonly body: string; readonly rating?: number | null },
    actorUserId: string,
  ): Promise<ApplicationNote> {
    const application = await this.applications.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }
    assertRating(input.rating);
    const note = await this.notes.create({
      applicationId,
      authorUserId: actorUserId,
      body: input.body,
      rating: input.rating ?? null,
    });
    await this.audit.append({
      actorUserId,
      entityType: "Application",
      entityId: applicationId,
      action: "note",
    });
    return note;
  }
}

/**
 * Rejects an active application and emails the candidate.
 */
export class RejectApplicationUseCase {
  constructor(
    private readonly jobs: IJobPostingRepository,
    private readonly applications: IApplicationRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(applicationId: string, actorUserId: string): Promise<ApplicationDetail> {
    const current = await this.applications.findById(applicationId);
    if (!current) {
      throw new NotFoundError("Application not found");
    }
    if (current.status !== "ACTIVE") {
      throw new ConflictError("Application is not active");
    }
    const posting = await this.jobs.findById(current.jobPostingId);
    const updated = await this.applications.updateStatus(applicationId, { status: "REJECTED" });
    await this.dispatcher.dispatch({
      type: "recruitment.decision",
      recipientEmail: updated.candidate.email,
      title: `Application update: ${posting?.title ?? "role"}`,
      body: `We will not proceed with your application for ${posting?.title ?? "the role"}.`,
      entityType: "Application",
      entityId: updated.id,
    });
    await this.audit.append({
      actorUserId,
      entityType: "Application",
      entityId: updated.id,
      action: "reject",
    });
    return updated;
  }
}
