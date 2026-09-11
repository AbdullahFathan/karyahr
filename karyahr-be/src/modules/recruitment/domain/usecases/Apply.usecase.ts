import { randomUUID } from "node:crypto";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import { assertAllowedUpload } from "../../../../shared/storage/assert-allowed-upload";
import { HR_ADMIN_ROLE, RECRUITER_ROLE } from "../../../../shared/auth/permissions";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { ApplicationDetail, FileUpload } from "../entities/Recruitment";
import { assertPostingAcceptsApplications } from "../recruitment-invariants";
import type {
  IApplicationAttachmentRepository,
  IApplicationRepository,
  ICandidateRepository,
  IJobPostingRepository,
} from "../repositories/IRecruitmentRepository";

export type ApplyInput = {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly nationalId?: string | null;
  readonly file?: FileUpload;
};

/**
 * Creates an application on an open posting (public or HR-entered).
 */
export class ApplyToJobUseCase {
  constructor(
    private readonly jobs: IJobPostingRepository,
    private readonly candidates: ICandidateRepository,
    private readonly applications: IApplicationRepository,
    private readonly attachments: IApplicationAttachmentRepository,
    private readonly storage: IObjectStorage,
    private readonly users: IUserRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
    private readonly maxUploadBytes: number,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(
    postingRef: { readonly id?: string; readonly slug?: string },
    input: ApplyInput,
    actorUserId: string | null,
  ): Promise<ApplicationDetail> {
    const posting = postingRef.id
      ? await this.jobs.findById(postingRef.id)
      : postingRef.slug
        ? await this.jobs.findBySlug(postingRef.slug)
        : null;
    if (!posting) {
      throw new NotFoundError("Job posting not found");
    }
    assertPostingAcceptsApplications(posting, this.clock());
    const firstStage = [...posting.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (!firstStage) {
      throw new ValidationError("Job posting has no pipeline stages");
    }

    const candidate = await this.candidates.upsertByEmail({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      nationalId: input.nationalId ?? null,
    });
    const existing = await this.applications.findByJobAndCandidate(posting.id, candidate.id);
    if (existing) {
      throw new ConflictError("Candidate already applied to this job");
    }

    const created = await this.applications.create({
      jobPostingId: posting.id,
      candidateId: candidate.id,
      stageId: firstStage.id,
    });

    if (input.file) {
      if (input.file.buffer.length === 0) {
        throw new ValidationError("File is empty");
      }
      if (input.file.buffer.length > this.maxUploadBytes) {
        throw new ValidationError("File exceeds maximum upload size");
      }
      assertAllowedUpload(input.file.contentType);
      const attachmentId = randomUUID();
      const objectKey = `recruitment/${created.id}/${attachmentId}`;
      await this.storage.putObject(objectKey, input.file.buffer, input.file.contentType);
      await this.attachments.create({
        id: attachmentId,
        applicationId: created.id,
        fileName: input.file.fileName,
        contentType: input.file.contentType,
        sizeBytes: input.file.buffer.length,
        objectKey,
        uploadedByUserId: actorUserId,
      });
    }

    const detail = await this.applications.findById(created.id);
    if (!detail) {
      throw new NotFoundError("Application not found");
    }

    await this.notifyReceived(posting.createdByUserId, detail.id, posting.title, candidate.fullName);
    await this.audit.append({
      actorUserId: actorUserId ?? posting.createdByUserId,
      entityType: "Application",
      entityId: detail.id,
      action: "apply",
      metadata: { jobPostingId: posting.id, candidateId: candidate.id },
    });
    return detail;
  }

  private async notifyReceived(
    creatorUserId: string,
    applicationId: string,
    jobTitle: string,
    candidateName: string,
  ): Promise<void> {
    const [hr, recruiters] = await Promise.all([
      this.users.listByRoleName(HR_ADMIN_ROLE),
      this.users.listByRoleName(RECRUITER_ROLE),
    ]);
    const recipientIds = [...new Set([creatorUserId, ...hr.map((u) => u.id), ...recruiters.map((u) => u.id)])];
    await Promise.all(
      recipientIds.map((recipientUserId) =>
        this.dispatcher.dispatch({
          type: "recruitment.application_received",
          recipientUserId,
          title: `New application: ${jobTitle}`,
          body: `${candidateName} applied for ${jobTitle}.`,
          entityType: "Application",
          entityId: applicationId,
        }),
      ),
    );
  }
}
