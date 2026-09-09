import type { PaginationParams } from "../../../../shared/utils/pagination";
import type {
  Application,
  ApplicationAttachment,
  ApplicationDetail,
  ApplicationNote,
  Candidate,
  JobPipelineStage,
  JobPosting,
  JobPostingDetail,
  JobPostingStatus,
} from "../entities/Recruitment";

export type CreateJobPostingInput = Omit<JobPosting, "id" | "slug" | "createdByUserId" | "status"> & {
  readonly slug?: string;
  readonly status?: JobPostingStatus;
  readonly stages?: readonly { readonly name: string; readonly isTerminal?: boolean }[];
};

export type UpdateJobPostingInput = Partial<
  Omit<JobPosting, "id" | "createdByUserId" | "slug">
> & {
  readonly slug?: string;
};

export type JobPostingListFilter = {
  readonly status?: JobPostingStatus;
  readonly pagination: PaginationParams;
};

export type UpsertCandidateInput = {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly nationalId?: string | null;
};

export type CreateApplicationInput = {
  readonly jobPostingId: string;
  readonly candidateId: string;
  readonly stageId: string;
};

export type IJobPostingRepository = {
  create(
    input: CreateJobPostingInput & { readonly slug: string; readonly createdByUserId: string },
  ): Promise<JobPostingDetail>;
  update(id: string, input: UpdateJobPostingInput): Promise<JobPostingDetail>;
  findById(id: string): Promise<JobPostingDetail | null>;
  findBySlug(slug: string): Promise<JobPostingDetail | null>;
  list(filter: JobPostingListFilter): Promise<{ readonly items: readonly JobPostingDetail[]; readonly total: number }>;
  listOpenPublic(): Promise<readonly JobPosting[]>;
  replaceStages(
    jobPostingId: string,
    stages: readonly {
      readonly id?: string;
      readonly name: string;
      readonly isTerminal: boolean;
    }[],
  ): Promise<readonly JobPipelineStage[]>;
};

export type ICandidateRepository = {
  upsertByEmail(input: UpsertCandidateInput): Promise<Candidate>;
  findById(id: string): Promise<Candidate | null>;
  findByEmail(email: string): Promise<Candidate | null>;
};

export type IApplicationRepository = {
  create(input: CreateApplicationInput): Promise<Application>;
  findById(id: string): Promise<ApplicationDetail | null>;
  findByJobAndCandidate(jobPostingId: string, candidateId: string): Promise<Application | null>;
  listByJob(jobPostingId: string): Promise<readonly ApplicationDetail[]>;
  updateStage(id: string, stageId: string): Promise<ApplicationDetail>;
  updateStatus(
    id: string,
    input: { readonly status: Application["status"]; readonly employeeId?: string | null },
  ): Promise<ApplicationDetail>;
  countActiveByJob(jobPostingId: string): Promise<number>;
};

export type IApplicationNoteRepository = {
  create(input: Omit<ApplicationNote, "id">): Promise<ApplicationNote>;
};

export type IApplicationAttachmentRepository = {
  create(
    input: Omit<ApplicationAttachment, "id"> & { readonly id: string },
  ): Promise<ApplicationAttachment>;
};
