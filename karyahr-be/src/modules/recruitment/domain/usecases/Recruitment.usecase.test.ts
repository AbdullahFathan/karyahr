import { describe, expect, test } from "bun:test";
import { ConflictError, ForbiddenError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { IObjectStorage, StoredObject } from "../../../../shared/storage/IObjectStorage";
import type { AuthUser } from "../../../auth/domain/entities/AuthUser";
import type { CreateUserInput, IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { Employee } from "../../../employees/domain/entities/Employee";
import type { CreateEmployeeInput, IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { NotificationEvent } from "../../../notifications/domain/entities/Notification";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { OnboardingProcess, OnboardingTemplate } from "../entities/Onboarding";
import type {
  Application,
  ApplicationAttachment,
  ApplicationDetail,
  ApplicationNote,
  Candidate,
  JobPipelineStage,
  JobPostingDetail,
} from "../entities/Recruitment";
import type { IHireEmployee } from "../ports/IHireEmployee";
import type { IProvisionEmployeeUser } from "../ports/IProvisionEmployeeUser";
import type {
  IApplicationAttachmentRepository,
  IApplicationNoteRepository,
  IApplicationRepository,
  ICandidateRepository,
  IJobPostingRepository,
} from "../repositories/IRecruitmentRepository";
import type {
  IOnboardingProcessRepository,
  IOnboardingTemplateRepository,
} from "../repositories/IOnboardingRepository";
import { ApplyToJobUseCase } from "./Apply.usecase";
import { ConvertCandidateUseCase } from "./ConvertCandidate.usecase";
import {
  CompleteOnboardingTaskUseCase,
  StartOnboardingProcessUseCase,
} from "./Onboarding.usecase";
import { MoveApplicationStageUseCase } from "./Pipeline.usecase";
import { PERMISSIONS } from "../../../../shared/auth/permissions";

const posting: JobPostingDetail = {
  id: "job1",
  slug: "engineer",
  title: "Engineer",
  description: "Build",
  qualifications: "TS",
  departmentId: "d1",
  positionId: "p1",
  headcount: 1,
  maxApplicants: 1,
  closesAt: null,
  status: "OPEN",
  createdByUserId: "u-hr",
  applicationCount: 0,
  stages: [
    { id: "s1", jobPostingId: "job1", name: "Screening", sortOrder: 0, isTerminal: false },
    { id: "s2", jobPostingId: "job1", name: "Interview", sortOrder: 1, isTerminal: false },
  ],
};

class MemoryAudit implements IAuditLogRepository {
  async append(): Promise<void> {}
}

class MemoryDispatcher implements INotificationDispatcher {
  readonly events: NotificationEvent[] = [];
  async dispatch(event: NotificationEvent): Promise<void> {
    this.events.push(event);
  }
}

class MemoryStorage implements IObjectStorage {
  async putObject(): Promise<void> {}
  async getObject(): Promise<StoredObject> {
    throw new Error("unused");
  }
  async deleteObject(): Promise<void> {}
}

class MemoryUsers implements IUserRepository {
  constructor(private readonly items: AuthUser[]) {}
  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.items.find((item) => item.email === email) ?? null;
  }
  async findById(id: string): Promise<AuthUser | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByEmployeeId(employeeId: string): Promise<AuthUser | null> {
    return this.items.find((item) => item.employeeId === employeeId) ?? null;
  }
  async listByRoleName(roleName: string): Promise<readonly AuthUser[]> {
    return this.items.filter((item) => item.roleNames.includes(roleName));
  }
  async setActiveByEmployeeId(): Promise<void> {}
  async create(input: CreateUserInput): Promise<AuthUser> {
    const user: AuthUser = {
      id: "u-new",
      email: input.email,
      passwordHash: input.passwordHash,
      employeeId: input.employeeId,
      isActive: true,
      roleNames: [input.roleName],
      permissionKeys: [],
    };
    this.items.push(user);
    return user;
  }
}

class MemoryJobs implements IJobPostingRepository {
  constructor(private item: JobPostingDetail) {}
  async create(): Promise<JobPostingDetail> {
    return this.item;
  }
  async update(): Promise<JobPostingDetail> {
    return this.item;
  }
  async findById(): Promise<JobPostingDetail | null> {
    return this.item;
  }
  async findBySlug(slug: string): Promise<JobPostingDetail | null> {
    return this.item.slug === slug ? this.item : null;
  }
  async list() {
    return { items: [this.item], total: 1 };
  }
  async listOpenPublic() {
    return [this.item];
  }
  async replaceStages(): Promise<readonly JobPipelineStage[]> {
    return this.item.stages;
  }
  bumpCount(): void {
    this.item = { ...this.item, applicationCount: this.item.applicationCount + 1 };
  }
}

class MemoryCandidates implements ICandidateRepository {
  private items: Candidate[] = [];
  async upsertByEmail(input: {
    fullName: string;
    email: string;
    phone: string;
    nationalId?: string | null;
  }): Promise<Candidate> {
    const existing = this.items.find((item) => item.email === input.email);
    if (existing) {
      const updated = { ...existing, ...input, nationalId: input.nationalId ?? existing.nationalId };
      this.items = this.items.map((item) => (item.id === existing.id ? updated : item));
      return updated;
    }
    const created: Candidate = {
      id: `c-${this.items.length + 1}`,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      nationalId: input.nationalId ?? null,
    };
    this.items.push(created);
    return created;
  }
  async findById(id: string): Promise<Candidate | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByEmail(email: string): Promise<Candidate | null> {
    return this.items.find((item) => item.email === email) ?? null;
  }
}

class MemoryApplications implements IApplicationRepository {
  items: ApplicationDetail[] = [];
  async create(input: { jobPostingId: string; candidateId: string; stageId: string }): Promise<Application> {
    const candidate: Candidate = {
      id: input.candidateId,
      fullName: "Pat",
      email: "pat@example.com",
      phone: "081",
      nationalId: "123",
    };
    const detail: ApplicationDetail = {
      id: `a-${this.items.length + 1}`,
      jobPostingId: input.jobPostingId,
      candidateId: input.candidateId,
      stageId: input.stageId,
      status: "ACTIVE",
      employeeId: null,
      candidate,
      stage: posting.stages[0]!,
      notes: [],
      attachments: [],
    };
    this.items.push(detail);
    return detail;
  }
  async findById(id: string): Promise<ApplicationDetail | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByJobAndCandidate(jobPostingId: string, candidateId: string): Promise<Application | null> {
    return this.items.find((item) => item.jobPostingId === jobPostingId && item.candidateId === candidateId) ?? null;
  }
  async listByJob(): Promise<readonly ApplicationDetail[]> {
    return this.items;
  }
  async updateStage(id: string, stageId: string): Promise<ApplicationDetail> {
    this.items = this.items.map((item) =>
      item.id === id
        ? { ...item, stageId, stage: posting.stages.find((stage) => stage.id === stageId)! }
        : item,
    );
    return this.items.find((item) => item.id === id)!;
  }
  async updateStatus(
    id: string,
    input: { status: Application["status"]; employeeId?: string | null },
  ): Promise<ApplicationDetail> {
    this.items = this.items.map((item) =>
      item.id === id ? { ...item, status: input.status, employeeId: input.employeeId ?? item.employeeId } : item,
    );
    return this.items.find((item) => item.id === id)!;
  }
  async countActiveByJob(): Promise<number> {
    return this.items.length;
  }
}

class MemoryAttachments implements IApplicationAttachmentRepository {
  async create(input: Omit<ApplicationAttachment, "id"> & { id: string }): Promise<ApplicationAttachment> {
    return input;
  }
}

class MemoryNotes implements IApplicationNoteRepository {
  async create(input: Omit<ApplicationNote, "id">): Promise<ApplicationNote> {
    return { id: "n1", ...input };
  }
}

class MemoryHire implements IHireEmployee {
  created: Employee | null = null;
  async create(input: CreateEmployeeInput): Promise<Employee> {
    this.created = { id: "e-new", ...input };
    return this.created;
  }
  async nextEmployeeNumber(year: number): Promise<string> {
    return `EMP-${year}-0001`;
  }
}

class MemoryProvision implements IProvisionEmployeeUser {
  async provision(input: { email: string; employeeId: string }) {
    return { userId: "u-hire", email: input.email, temporaryPassword: "temp-pass" };
  }
}

class MemoryEmployees implements IEmployeeRepository {
  constructor(private readonly items: Employee[]) {}
  async create(input: CreateEmployeeInput): Promise<Employee> {
    return { id: "x", ...input };
  }
  async update(): Promise<Employee> {
    return this.items[0]!;
  }
  async findById(id: string): Promise<Employee | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list() {
    return { items: this.items, total: this.items.length };
  }
  async listDirectory() {
    return this.items;
  }
}

class MemoryTemplates implements IOnboardingTemplateRepository {
  constructor(private readonly template: OnboardingTemplate | null) {}
  async create(): Promise<OnboardingTemplate> {
    return this.template!;
  }
  async update(): Promise<OnboardingTemplate> {
    return this.template!;
  }
  async findById(): Promise<OnboardingTemplate | null> {
    return this.template;
  }
  async list() {
    return this.template ? [this.template] : [];
  }
  async findForPosition(): Promise<OnboardingTemplate | null> {
    return this.template;
  }
  async addItem() {
    return this.template!.items[0]!;
  }
  async updateItem() {
    return this.template!.items[0]!;
  }
  async deleteItem(): Promise<void> {}
}

class MemoryProcesses implements IOnboardingProcessRepository {
  process: OnboardingProcess | null = null;
  async createFromTemplate(input: {
    employeeId: string;
    template: OnboardingTemplate;
    managerId: string | null;
  }): Promise<OnboardingProcess> {
    this.process = {
      id: "proc1",
      employeeId: input.employeeId,
      templateId: input.template.id,
      status: "IN_PROGRESS",
      tasks: input.template.items.map((item, index) => ({
        id: `t${index}`,
        processId: "proc1",
        title: item.title,
        description: item.description,
        assigneeKind: item.assigneeKind,
        assigneeEmployeeId: item.assigneeKind === "NEW_HIRE" ? input.employeeId : null,
        sortOrder: item.sortOrder,
        completedAt: null,
      })),
    };
    return this.process;
  }
  async findByEmployeeId(): Promise<OnboardingProcess | null> {
    return this.process;
  }
  async findById(): Promise<OnboardingProcess | null> {
    return this.process;
  }
  async findTaskById(taskId: string): Promise<OnboardingProcess | null> {
    if (!this.process?.tasks.some((task) => task.id === taskId)) {
      return null;
    }
    return this.process;
  }
  async completeTask(taskId: string, completedAt: Date): Promise<OnboardingProcess> {
    this.process = {
      ...this.process!,
      tasks: this.process!.tasks.map((task) => (task.id === taskId ? { ...task, completedAt } : task)),
    };
    return this.process;
  }
  async markCompleted(): Promise<OnboardingProcess> {
    this.process = { ...this.process!, status: "COMPLETED" };
    return this.process;
  }
  async listDashboard() {
    return [];
  }
}

function applyUseCase(jobs: MemoryJobs, applications: MemoryApplications, dispatcher: MemoryDispatcher) {
  return new ApplyToJobUseCase(
    jobs,
    new MemoryCandidates(),
    applications,
    new MemoryAttachments(),
    new MemoryStorage(),
    new MemoryUsers([
      {
        id: "u-hr",
        email: "hr@local",
        passwordHash: "x",
        employeeId: "e-hr",
        isActive: true,
        roleNames: ["hr_admin"],
        permissionKeys: [],
      },
    ]),
    dispatcher,
    new MemoryAudit(),
    1024,
  );
}

describe("ApplyToJobUseCase", () => {
  test("rejects a second apply when quota is reached", async () => {
    const jobs = new MemoryJobs({ ...posting });
    const applications = new MemoryApplications();
    const useCase = applyUseCase(jobs, applications, new MemoryDispatcher());
    await useCase.execute({ slug: "engineer" }, { fullName: "A", email: "a@x.com", phone: "1" }, null);
    jobs.bumpCount();
    await expect(
      useCase.execute({ slug: "engineer" }, { fullName: "B", email: "b@x.com", phone: "2" }, null),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("rejects duplicate apply for the same candidate", async () => {
    const jobs = new MemoryJobs({ ...posting, maxApplicants: 5 });
    const applications = new MemoryApplications();
    const useCase = applyUseCase(jobs, applications, new MemoryDispatcher());
    await useCase.execute({ slug: "engineer" }, { fullName: "A", email: "a@x.com", phone: "1" }, null);
    await expect(
      useCase.execute({ slug: "engineer" }, { fullName: "A", email: "a@x.com", phone: "1" }, null),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("rejects apply when posting is closed", async () => {
    const jobs = new MemoryJobs({ ...posting, status: "CLOSED" });
    await expect(
      applyUseCase(jobs, new MemoryApplications(), new MemoryDispatcher()).execute(
        { slug: "engineer" },
        { fullName: "A", email: "a@x.com", phone: "1" },
        null,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("MoveApplicationStageUseCase", () => {
  test("rejects a stage that belongs to another posting", async () => {
    const applications = new MemoryApplications();
    await applications.create({ jobPostingId: "job1", candidateId: "c1", stageId: "s1" });
    const useCase = new MoveApplicationStageUseCase(
      new MemoryJobs({ ...posting }),
      applications,
      new MemoryDispatcher(),
      new MemoryAudit(),
    );
    await expect(useCase.execute("a-1", "other-stage", "u-hr")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("ConvertCandidateUseCase", () => {
  test("refuses a second hire", async () => {
    const applications = new MemoryApplications();
    await applications.create({ jobPostingId: "job1", candidateId: "c1", stageId: "s1" });
    await applications.updateStatus("a-1", { status: "HIRED", employeeId: "e-old" });
    const templates = new MemoryTemplates({
      id: "tmpl",
      name: "Default",
      positionId: "p1",
      items: [],
    });
    const useCase = new ConvertCandidateUseCase(
      new MemoryJobs({ ...posting }),
      applications,
      new MemoryHire(),
      new MemoryProvision(),
      new StartOnboardingProcessUseCase(templates, new MemoryProcesses()),
      new MemoryDispatcher(),
      new MemoryAudit(),
    );
    await expect(
      useCase.execute(
        "a-1",
        {
          birthDate: new Date("1990-01-01"),
          address: "Jakarta",
          emergencyContact: "081",
          joinedAt: new Date("2026-01-01"),
          contractType: "PERMANENT",
        },
        "u-hr",
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("CompleteOnboardingTaskUseCase", () => {
  test("marks the process completed when every task is done", async () => {
    const processes = new MemoryProcesses();
    const template: OnboardingTemplate = {
      id: "tmpl",
      name: "Default",
      positionId: null,
      items: [
        {
          id: "i1",
          templateId: "tmpl",
          title: "Docs",
          description: "Upload",
          assigneeKind: "NEW_HIRE",
          sortOrder: 0,
        },
      ],
    };
    await processes.createFromTemplate({ employeeId: "e1", template, managerId: null });
    const useCase = new CompleteOnboardingTaskUseCase(processes, new MemoryEmployees([]));
    const result = await useCase.execute("t0", {
      userId: "u1",
      employeeId: "e1",
      permissionKeys: [PERMISSIONS.ONBOARDING_TASKS_COMPLETE],
    });
    expect(result.status).toBe("COMPLETED");
  });

  test("forbids another employee from completing a new-hire task", async () => {
    const processes = new MemoryProcesses();
    await processes.createFromTemplate({
      employeeId: "e1",
      template: {
        id: "tmpl",
        name: "Default",
        positionId: null,
        items: [
          {
            id: "i1",
            templateId: "tmpl",
            title: "Docs",
            description: "Upload",
            assigneeKind: "NEW_HIRE",
            sortOrder: 0,
          },
        ],
      },
      managerId: null,
    });
    const useCase = new CompleteOnboardingTaskUseCase(processes, new MemoryEmployees([]));
    await expect(
      useCase.execute("t0", {
        userId: "u2",
        employeeId: "e2",
        permissionKeys: [PERMISSIONS.ONBOARDING_TASKS_COMPLETE],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
