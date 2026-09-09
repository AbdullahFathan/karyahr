import { describe, expect, test } from "bun:test";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { JobPipelineStage, JobPostingDetail } from "../entities/Recruitment";
import type {
  CreateJobPostingInput,
  IJobPostingRepository,
  JobPostingListFilter,
  UpdateJobPostingInput,
} from "../repositories/IRecruitmentRepository";
import {
  CreateJobPostingUseCase,
  GetJobPostingUseCase,
  GetPublicCareerUseCase,
  ListJobPostingsUseCase,
  ListPublicCareersUseCase,
  ReplaceJobStagesUseCase,
  UpdateJobPostingUseCase,
} from "./JobPosting.usecase";

class MemoryJobs implements IJobPostingRepository {
  rows: JobPostingDetail[] = [];
  async create(
    input: CreateJobPostingInput & { readonly slug: string; readonly createdByUserId: string },
  ): Promise<JobPostingDetail> {
    const id = `job${this.rows.length + 1}`;
    const stages = (input.stages ?? []).map((stage, index) => ({
      id: `${id}-s${index}`,
      jobPostingId: id,
      name: stage.name,
      sortOrder: index,
      isTerminal: stage.isTerminal ?? false,
    }));
    const row: JobPostingDetail = {
      id,
      slug: input.slug,
      title: input.title,
      description: input.description,
      qualifications: input.qualifications,
      departmentId: input.departmentId,
      positionId: input.positionId,
      headcount: input.headcount,
      maxApplicants: input.maxApplicants,
      closesAt: input.closesAt,
      status: input.status ?? "OPEN",
      createdByUserId: input.createdByUserId,
      applicationCount: 0,
      stages,
    };
    this.rows.push(row);
    return row;
  }
  async update(id: string, input: UpdateJobPostingInput): Promise<JobPostingDetail> {
    this.rows = this.rows.map((row) => {
      if (row.id !== id) {
        return row;
      }
      const next = { ...row };
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          (next as Record<string, unknown>)[key] = value;
        }
      }
      return next;
    });
    return this.rows.find((row) => row.id === id)!;
  }
  async findById(id: string): Promise<JobPostingDetail | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findBySlug(slug: string): Promise<JobPostingDetail | null> {
    return this.rows.find((row) => row.slug === slug) ?? null;
  }
  async list(filter: JobPostingListFilter) {
    return { items: this.rows, total: this.rows.length };
  }
  async listOpenPublic() {
    return this.rows.filter((row) => row.status === "OPEN");
  }
  async replaceStages(
    jobPostingId: string,
    stages: readonly { readonly id?: string; readonly name: string; readonly isTerminal: boolean }[],
  ): Promise<readonly JobPipelineStage[]> {
    const next = stages.map((stage, index) => ({
      id: stage.id ?? `s${index}`,
      jobPostingId,
      name: stage.name,
      sortOrder: index,
      isTerminal: stage.isTerminal,
    }));
    this.rows = this.rows.map((row) => (row.id === jobPostingId ? { ...row, stages: next } : row));
    return next;
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };

describe("JobPosting use cases", () => {
  test("creates a posting with a unique slug suffix", async () => {
    const jobs = new MemoryJobs();
    await new CreateJobPostingUseCase(jobs, audit).execute(
      {
        title: "Engineer",
        description: "Build",
        qualifications: "TS",
        departmentId: "d1",
        positionId: "p1",
        headcount: 1,
        maxApplicants: 10,
        closesAt: null,
        slug: "engineer",
      },
      "u-hr",
    );
    const second = await new CreateJobPostingUseCase(jobs, audit).execute(
      {
        title: "Engineer",
        description: "Build",
        qualifications: "TS",
        departmentId: "d1",
        positionId: "p1",
        headcount: 1,
        maxApplicants: 10,
        closesAt: null,
        slug: "engineer",
      },
      "u-hr",
    );
    expect(second.slug).toBe("engineer-2");
    await expect(
      new CreateJobPostingUseCase(jobs, audit).execute(
        {
          title: "X",
          description: "x",
          qualifications: "x",
          departmentId: "d1",
          positionId: "p1",
          headcount: 0,
          maxApplicants: 1,
          closesAt: null,
        },
        "u-hr",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("updates, lists, and loads public careers", async () => {
    const jobs = new MemoryJobs();
    const created = await new CreateJobPostingUseCase(jobs, audit).execute(
      {
        title: "PM",
        description: "Lead",
        qualifications: "x",
        departmentId: "d1",
        positionId: "p1",
        headcount: 1,
        maxApplicants: 5,
        closesAt: null,
        status: "OPEN",
      },
      "u-hr",
    );
    const updated = await new UpdateJobPostingUseCase(jobs, audit).execute(
      created.id,
      { title: "Product" },
      "u-hr",
    );
    expect(updated.title).toBe("Product");
    await expect(
      new UpdateJobPostingUseCase(jobs, audit).execute("missing", { title: "x" }, "u-hr"),
    ).rejects.toBeInstanceOf(NotFoundError);
    const stages = await new ReplaceJobStagesUseCase(jobs, audit).execute(
      created.id,
      [{ name: "Screen", isTerminal: false }],
      "u-hr",
    );
    expect(stages).toHaveLength(1);
    await expect(
      new ReplaceJobStagesUseCase(jobs, audit).execute(created.id, [], "u-hr"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(
      (await new ListJobPostingsUseCase(jobs).execute({ pagination: { page: 1, pageSize: 20, skip: 0, take: 20 } }))
        .total,
    ).toBe(1);
    expect((await new GetJobPostingUseCase(jobs).execute(created.id)).id).toBe(created.id);
    expect((await new ListPublicCareersUseCase(jobs).execute())[0]?.slug).toBe("pm");
    expect((await new GetPublicCareerUseCase(jobs).execute("pm")).title).toBe("Product");
    await jobs.update(created.id, { status: "CLOSED" });
    await expect(new GetPublicCareerUseCase(jobs).execute("pm")).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new UpdateJobPostingUseCase(jobs, audit).execute(created.id, { slug: "pm" }, "u-hr"),
    ).resolves.toBeTruthy();
    const other = await new CreateJobPostingUseCase(jobs, audit).execute(
      {
        title: "Other",
        description: "x",
        qualifications: "x",
        departmentId: "d1",
        positionId: "p1",
        headcount: 1,
        maxApplicants: 1,
        closesAt: null,
        slug: "taken",
      },
      "u-hr",
    );
    await expect(
      new UpdateJobPostingUseCase(jobs, audit).execute(created.id, { slug: other.slug }, "u-hr"),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
