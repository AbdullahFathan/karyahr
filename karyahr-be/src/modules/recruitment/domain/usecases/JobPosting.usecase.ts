import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import { DEFAULT_PIPELINE_STAGES, type JobPostingDetail, type JobPipelineStage } from "../entities/Recruitment";
import { slugifyTitle } from "../recruitment-invariants";
import type {
  CreateJobPostingInput,
  IJobPostingRepository,
  JobPostingListFilter,
  UpdateJobPostingInput,
} from "../repositories/IRecruitmentRepository";

/**
 * Creates a job posting with default or custom pipeline stages.
 */
export class CreateJobPostingUseCase {
  constructor(
    private readonly jobs: IJobPostingRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: CreateJobPostingInput, actorUserId: string): Promise<JobPostingDetail> {
    if (input.headcount < 1 || input.maxApplicants < 1) {
      throw new ValidationError("headcount and maxApplicants must be at least 1");
    }
    const slug = await this.uniqueSlug(input.slug ?? slugifyTitle(input.title));
    const stages =
      input.stages && input.stages.length > 0
        ? input.stages
        : DEFAULT_PIPELINE_STAGES.map((name) => ({ name, isTerminal: false }));
    const posting = await this.jobs.create({
      ...input,
      slug,
      createdByUserId: actorUserId,
      stages,
    });
    await this.audit.append({
      actorUserId,
      entityType: "JobPosting",
      entityId: posting.id,
      action: "create",
      metadata: { slug: posting.slug },
    });
    return posting;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let suffix = 2;
    while (await this.jobs.findBySlug(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }
}

/**
 * Updates a job posting.
 */
export class UpdateJobPostingUseCase {
  constructor(
    private readonly jobs: IJobPostingRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(id: string, input: UpdateJobPostingInput, actorUserId: string): Promise<JobPostingDetail> {
    const current = await this.jobs.findById(id);
    if (!current) {
      throw new NotFoundError("Job posting not found");
    }
    let slug = input.slug;
    if (slug && slug !== current.slug && (await this.jobs.findBySlug(slug))) {
      throw new ConflictError("Slug already exists");
    }
    const posting = await this.jobs.update(id, { ...input, slug });
    await this.audit.append({
      actorUserId,
      entityType: "JobPosting",
      entityId: posting.id,
      action: "update",
    });
    return posting;
  }
}

/**
 * Replaces or reorders pipeline stages for a posting.
 */
export class ReplaceJobStagesUseCase {
  constructor(
    private readonly jobs: IJobPostingRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    jobPostingId: string,
    stages: readonly { readonly id?: string; readonly name: string; readonly isTerminal: boolean }[],
    actorUserId: string,
  ): Promise<readonly JobPipelineStage[]> {
    if (stages.length === 0) {
      throw new ValidationError("At least one stage is required");
    }
    const current = await this.jobs.findById(jobPostingId);
    if (!current) {
      throw new NotFoundError("Job posting not found");
    }
    const updated = await this.jobs.replaceStages(jobPostingId, stages);
    await this.audit.append({
      actorUserId,
      entityType: "JobPosting",
      entityId: jobPostingId,
      action: "replace_stages",
    });
    return updated;
  }
}

/**
 * Lists job postings for HR.
 */
export class ListJobPostingsUseCase {
  constructor(private readonly jobs: IJobPostingRepository) {}

  execute(filter: JobPostingListFilter) {
    return this.jobs.list(filter);
  }
}

/**
 * Gets one job posting.
 */
export class GetJobPostingUseCase {
  constructor(private readonly jobs: IJobPostingRepository) {}

  async execute(id: string): Promise<JobPostingDetail> {
    const posting = await this.jobs.findById(id);
    if (!posting) {
      throw new NotFoundError("Job posting not found");
    }
    return posting;
  }
}

/**
 * Lists open postings for the public careers page.
 */
export class ListPublicCareersUseCase {
  constructor(private readonly jobs: IJobPostingRepository) {}

  execute() {
    return this.jobs.listOpenPublic();
  }
}

/**
 * Gets an open posting by slug for public careers.
 */
export class GetPublicCareerUseCase {
  constructor(private readonly jobs: IJobPostingRepository) {}

  async execute(slug: string): Promise<JobPostingDetail> {
    const posting = await this.jobs.findBySlug(slug);
    if (!posting || posting.status !== "OPEN") {
      throw new NotFoundError("Job posting not found");
    }
    return posting;
  }
}
