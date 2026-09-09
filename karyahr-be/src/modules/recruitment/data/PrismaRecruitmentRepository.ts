import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import { ConflictError } from "../../../shared/errors/app-error";
import type {
  Application,
  ApplicationAttachment,
  ApplicationDetail,
  ApplicationNote,
  Candidate,
  JobPipelineStage,
  JobPosting,
  JobPostingDetail,
} from "../domain/entities/Recruitment";
import type {
  CreateApplicationInput,
  CreateJobPostingInput,
  IApplicationAttachmentRepository,
  IApplicationNoteRepository,
  IApplicationRepository,
  ICandidateRepository,
  IJobPostingRepository,
  JobPostingListFilter,
  UpdateJobPostingInput,
  UpsertCandidateInput,
} from "../domain/repositories/IRecruitmentRepository";

type StageRow = {
  id: string;
  jobPostingId: string;
  name: string;
  sortOrder: number;
  isTerminal: boolean;
};

type JobRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  qualifications: string;
  departmentId: string;
  positionId: string;
  headcount: number;
  maxApplicants: number;
  closesAt: Date | null;
  status: JobPosting["status"];
  createdByUserId: string;
  stages: StageRow[];
  _count: { applications: number };
};

function toStage(row: StageRow): JobPipelineStage {
  return {
    id: row.id,
    jobPostingId: row.jobPostingId,
    name: row.name,
    sortOrder: row.sortOrder,
    isTerminal: row.isTerminal,
  };
}

function toPosting(row: JobRow): JobPostingDetail {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    qualifications: row.qualifications,
    departmentId: row.departmentId,
    positionId: row.positionId,
    headcount: row.headcount,
    maxApplicants: row.maxApplicants,
    closesAt: row.closesAt,
    status: row.status,
    createdByUserId: row.createdByUserId,
    stages: row.stages.map(toStage),
    applicationCount: row._count.applications,
  };
}

function toCandidate(row: Candidate): Candidate {
  return row;
}

function toNote(row: ApplicationNote): ApplicationNote {
  return row;
}

function toAttachment(row: ApplicationAttachment): ApplicationAttachment {
  return row;
}

function toApplicationDetail(row: {
  id: string;
  jobPostingId: string;
  candidateId: string;
  stageId: string;
  status: Application["status"];
  employeeId: string | null;
  candidate: Candidate;
  stage: StageRow;
  notes: ApplicationNote[];
  attachments: ApplicationAttachment[];
}): ApplicationDetail {
  return {
    id: row.id,
    jobPostingId: row.jobPostingId,
    candidateId: row.candidateId,
    stageId: row.stageId,
    status: row.status,
    employeeId: row.employeeId,
    candidate: toCandidate(row.candidate),
    stage: toStage(row.stage),
    notes: row.notes.map(toNote),
    attachments: row.attachments.map(toAttachment),
  };
}

const jobInclude = {
  stages: { orderBy: { sortOrder: "asc" as const } },
  _count: { select: { applications: true } },
};

const applicationInclude = {
  candidate: true,
  stage: true,
  notes: { orderBy: { createdAt: "asc" as const } },
  attachments: true,
};

/**
 * Job posting persistence with Prisma.
 */
export class PrismaJobPostingRepository implements IJobPostingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    input: CreateJobPostingInput & { readonly slug: string; readonly createdByUserId: string },
  ): Promise<JobPostingDetail> {
    const stages = input.stages ?? [];
    const row = await this.prisma.jobPosting.create({
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description,
        qualifications: input.qualifications,
        departmentId: input.departmentId,
        positionId: input.positionId,
        headcount: input.headcount,
        maxApplicants: input.maxApplicants,
        closesAt: input.closesAt,
        status: input.status ?? "DRAFT",
        createdByUserId: input.createdByUserId,
        stages: {
          create: stages.map((stage, index) => ({
            name: stage.name,
            sortOrder: index,
            isTerminal: stage.isTerminal ?? false,
          })),
        },
      },
      include: jobInclude,
    });
    return toPosting(row);
  }

  async update(id: string, input: UpdateJobPostingInput): Promise<JobPostingDetail> {
    const row = await this.prisma.jobPosting.update({
      where: { id },
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description,
        qualifications: input.qualifications,
        departmentId: input.departmentId,
        positionId: input.positionId,
        headcount: input.headcount,
        maxApplicants: input.maxApplicants,
        closesAt: input.closesAt,
        status: input.status,
      },
      include: jobInclude,
    });
    return toPosting(row);
  }

  async findById(id: string): Promise<JobPostingDetail | null> {
    const row = await this.prisma.jobPosting.findUnique({ where: { id }, include: jobInclude });
    return row ? toPosting(row) : null;
  }

  async findBySlug(slug: string): Promise<JobPostingDetail | null> {
    const row = await this.prisma.jobPosting.findUnique({ where: { slug }, include: jobInclude });
    return row ? toPosting(row) : null;
  }

  async list(
    filter: JobPostingListFilter,
  ): Promise<{ readonly items: readonly JobPostingDetail[]; readonly total: number }> {
    const where = filter.status ? { status: filter.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where,
        include: jobInclude,
        orderBy: { createdAt: "desc" },
        skip: filter.pagination.skip,
        take: filter.pagination.take,
      }),
      this.prisma.jobPosting.count({ where }),
    ]);
    return { items: rows.map(toPosting), total };
  }

  async listOpenPublic(): Promise<readonly JobPosting[]> {
    const rows = await this.prisma.jobPosting.findMany({
      where: {
        status: "OPEN",
        OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
      },
      include: jobInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toPosting);
  }

  async replaceStages(
    jobPostingId: string,
    stages: readonly { readonly id?: string; readonly name: string; readonly isTerminal: boolean }[],
  ): Promise<readonly JobPipelineStage[]> {
    const existing = await this.prisma.jobPipelineStage.findMany({
      where: { jobPostingId },
      include: { _count: { select: { applications: true } } },
    });
    const keepIds = new Set(stages.map((stage) => stage.id).filter((id): id is string => Boolean(id)));
    const removing = existing.filter((stage) => !keepIds.has(stage.id));
    if (removing.some((stage) => stage._count.applications > 0)) {
      throw new ConflictError("Cannot remove a stage that has applications");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.jobPipelineStage.deleteMany({
        where: { jobPostingId, id: { in: removing.map((stage) => stage.id) } },
      });
      for (const [index, stage] of stages.entries()) {
        if (stage.id) {
          await tx.jobPipelineStage.update({
            where: { id: stage.id },
            data: { name: stage.name, isTerminal: stage.isTerminal, sortOrder: index },
          });
        } else {
          await tx.jobPipelineStage.create({
            data: {
              jobPostingId,
              name: stage.name,
              isTerminal: stage.isTerminal,
              sortOrder: index,
            },
          });
        }
      }
    });
    const rows = await this.prisma.jobPipelineStage.findMany({
      where: { jobPostingId },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toStage);
  }
}

/**
 * Candidate persistence with Prisma.
 */
export class PrismaCandidateRepository implements ICandidateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByEmail(input: UpsertCandidateInput): Promise<Candidate> {
    const email = input.email.toLowerCase();
    return toCandidate(
      await this.prisma.candidate.upsert({
        where: { email },
        update: {
          fullName: input.fullName,
          phone: input.phone,
          nationalId: input.nationalId ?? undefined,
        },
        create: {
          fullName: input.fullName,
          email,
          phone: input.phone,
          nationalId: input.nationalId ?? null,
        },
      }),
    );
  }

  async findById(id: string): Promise<Candidate | null> {
    const row = await this.prisma.candidate.findUnique({ where: { id } });
    return row ? toCandidate(row) : null;
  }

  async findByEmail(email: string): Promise<Candidate | null> {
    const row = await this.prisma.candidate.findUnique({ where: { email: email.toLowerCase() } });
    return row ? toCandidate(row) : null;
  }
}

/**
 * Application persistence with Prisma.
 */
export class PrismaApplicationRepository implements IApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateApplicationInput): Promise<Application> {
    const row = await this.prisma.application.create({ data: input });
    return {
      id: row.id,
      jobPostingId: row.jobPostingId,
      candidateId: row.candidateId,
      stageId: row.stageId,
      status: row.status,
      employeeId: row.employeeId,
    };
  }

  async findById(id: string): Promise<ApplicationDetail | null> {
    const row = await this.prisma.application.findUnique({
      where: { id },
      include: applicationInclude,
    });
    return row ? toApplicationDetail(row) : null;
  }

  async findByJobAndCandidate(jobPostingId: string, candidateId: string): Promise<Application | null> {
    const row = await this.prisma.application.findUnique({
      where: { jobPostingId_candidateId: { jobPostingId, candidateId } },
    });
    return row
      ? {
          id: row.id,
          jobPostingId: row.jobPostingId,
          candidateId: row.candidateId,
          stageId: row.stageId,
          status: row.status,
          employeeId: row.employeeId,
        }
      : null;
  }

  async listByJob(jobPostingId: string): Promise<readonly ApplicationDetail[]> {
    const rows = await this.prisma.application.findMany({
      where: { jobPostingId },
      include: applicationInclude,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toApplicationDetail);
  }

  async updateStage(id: string, stageId: string): Promise<ApplicationDetail> {
    const row = await this.prisma.application.update({
      where: { id },
      data: { stageId },
      include: applicationInclude,
    });
    return toApplicationDetail(row);
  }

  async updateStatus(
    id: string,
    input: { readonly status: Application["status"]; readonly employeeId?: string | null },
  ): Promise<ApplicationDetail> {
    const row = await this.prisma.application.update({
      where: { id },
      data: { status: input.status, employeeId: input.employeeId },
      include: applicationInclude,
    });
    return toApplicationDetail(row);
  }

  countActiveByJob(jobPostingId: string): Promise<number> {
    return this.prisma.application.count({ where: { jobPostingId } });
  }
}

/**
 * Application notes persistence with Prisma.
 */
export class PrismaApplicationNoteRepository implements IApplicationNoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<ApplicationNote, "id">): Promise<ApplicationNote> {
    return toNote(await this.prisma.applicationNote.create({ data: input }));
  }
}

/**
 * Application attachment persistence with Prisma.
 */
export class PrismaApplicationAttachmentRepository implements IApplicationAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    input: Omit<ApplicationAttachment, "id"> & { readonly id: string },
  ): Promise<ApplicationAttachment> {
    return toAttachment(await this.prisma.applicationAttachment.create({ data: input }));
  }
}
