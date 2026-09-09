import type { PrismaClient } from "../../../../prisma/generated/prisma/client";
import type {
  OnboardingDashboardRow,
  OnboardingProcess,
  OnboardingTask,
  OnboardingTemplate,
  OnboardingTemplateItem,
} from "../domain/entities/Onboarding";
import type {
  CreateOnboardingTemplateInput,
  CreateTemplateItemInput,
  IOnboardingProcessRepository,
  IOnboardingTemplateRepository,
} from "../domain/repositories/IOnboardingRepository";

function toItem(row: OnboardingTemplateItem): OnboardingTemplateItem {
  return row;
}

function toTemplate(row: {
  id: string;
  name: string;
  positionId: string | null;
  items: OnboardingTemplateItem[];
}): OnboardingTemplate {
  return {
    id: row.id,
    name: row.name,
    positionId: row.positionId,
    items: [...row.items].sort((a, b) => a.sortOrder - b.sortOrder).map(toItem),
  };
}

function toTask(row: OnboardingTask): OnboardingTask {
  return row;
}

function toProcess(row: {
  id: string;
  employeeId: string;
  templateId: string;
  status: OnboardingProcess["status"];
  tasks: OnboardingTask[];
}): OnboardingProcess {
  return {
    id: row.id,
    employeeId: row.employeeId,
    templateId: row.templateId,
    status: row.status,
    tasks: [...row.tasks].sort((a, b) => a.sortOrder - b.sortOrder).map(toTask),
  };
}

const templateInclude = { items: { orderBy: { sortOrder: "asc" as const } } };
const processInclude = { tasks: { orderBy: { sortOrder: "asc" as const } } };

/**
 * Onboarding template persistence with Prisma.
 */
export class PrismaOnboardingTemplateRepository implements IOnboardingTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateOnboardingTemplateInput): Promise<OnboardingTemplate> {
    return toTemplate(
      await this.prisma.onboardingTemplate.create({
        data: { name: input.name, positionId: input.positionId },
        include: templateInclude,
      }),
    );
  }

  async update(
    id: string,
    input: Partial<CreateOnboardingTemplateInput>,
  ): Promise<OnboardingTemplate> {
    return toTemplate(
      await this.prisma.onboardingTemplate.update({
        where: { id },
        data: { name: input.name, positionId: input.positionId },
        include: templateInclude,
      }),
    );
  }

  async findById(id: string): Promise<OnboardingTemplate | null> {
    const row = await this.prisma.onboardingTemplate.findUnique({
      where: { id },
      include: templateInclude,
    });
    return row ? toTemplate(row) : null;
  }

  async list(): Promise<readonly OnboardingTemplate[]> {
    const rows = await this.prisma.onboardingTemplate.findMany({
      include: templateInclude,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toTemplate);
  }

  async findForPosition(positionId: string): Promise<OnboardingTemplate | null> {
    const positioned = await this.prisma.onboardingTemplate.findFirst({
      where: { positionId },
      include: templateInclude,
    });
    if (positioned) {
      return toTemplate(positioned);
    }
    const fallback = await this.prisma.onboardingTemplate.findFirst({
      where: { positionId: null },
      include: templateInclude,
      orderBy: { createdAt: "asc" },
    });
    return fallback ? toTemplate(fallback) : null;
  }

  async addItem(input: CreateTemplateItemInput): Promise<OnboardingTemplateItem> {
    return toItem(await this.prisma.onboardingTemplateItem.create({ data: input }));
  }

  async updateItem(
    id: string,
    input: Partial<Omit<CreateTemplateItemInput, "templateId">>,
  ): Promise<OnboardingTemplateItem> {
    return toItem(await this.prisma.onboardingTemplateItem.update({ where: { id }, data: input }));
  }

  async deleteItem(id: string): Promise<void> {
    await this.prisma.onboardingTemplateItem.delete({ where: { id } });
  }
}

/**
 * Onboarding process persistence with Prisma.
 */
export class PrismaOnboardingProcessRepository implements IOnboardingProcessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createFromTemplate(input: {
    readonly employeeId: string;
    readonly template: OnboardingTemplate;
    readonly managerId: string | null;
  }): Promise<OnboardingProcess> {
    const row = await this.prisma.onboardingProcess.create({
      data: {
        employeeId: input.employeeId,
        templateId: input.template.id,
        tasks: {
          create: input.template.items.map((item) => ({
            title: item.title,
            description: item.description,
            assigneeKind: item.assigneeKind,
            sortOrder: item.sortOrder,
            assigneeEmployeeId:
              item.assigneeKind === "NEW_HIRE"
                ? input.employeeId
                : item.assigneeKind === "MANAGER"
                  ? input.managerId
                  : null,
          })),
        },
      },
      include: processInclude,
    });
    return toProcess(row);
  }

  async findByEmployeeId(employeeId: string): Promise<OnboardingProcess | null> {
    const row = await this.prisma.onboardingProcess.findUnique({
      where: { employeeId },
      include: processInclude,
    });
    return row ? toProcess(row) : null;
  }

  async findById(id: string): Promise<OnboardingProcess | null> {
    const row = await this.prisma.onboardingProcess.findUnique({
      where: { id },
      include: processInclude,
    });
    return row ? toProcess(row) : null;
  }

  async findTaskById(taskId: string): Promise<OnboardingProcess | null> {
    const task = await this.prisma.onboardingTask.findUnique({ where: { id: taskId } });
    if (!task) {
      return null;
    }
    return this.findById(task.processId);
  }

  async completeTask(taskId: string, completedAt: Date): Promise<OnboardingProcess> {
    const task = await this.prisma.onboardingTask.update({
      where: { id: taskId },
      data: { completedAt },
    });
    const process = await this.findById(task.processId);
    if (!process) {
      throw new Error("Onboarding process missing after task update");
    }
    return process;
  }

  async markCompleted(processId: string): Promise<OnboardingProcess> {
    const row = await this.prisma.onboardingProcess.update({
      where: { id: processId },
      data: { status: "COMPLETED" },
      include: processInclude,
    });
    return toProcess(row);
  }

  async listDashboard(
    pagination: import("../../../shared/utils/pagination").PaginationParams,
  ): Promise<{ readonly items: readonly OnboardingDashboardRow[]; readonly total: number }> {
    const [total, rows] = await Promise.all([
      this.prisma.onboardingProcess.count(),
      this.prisma.onboardingProcess.findMany({
        include: { tasks: true },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);
    return {
      total,
      items: rows.map((row) => {
        const totalCount = row.tasks.length;
        const completedCount = row.tasks.filter((task) => task.completedAt !== null).length;
        return {
          employeeId: row.employeeId,
          processId: row.id,
          status: row.status,
          completedCount,
          totalCount,
          progress: totalCount === 0 ? 1 : completedCount / totalCount,
        };
      }),
    };
  }
}
