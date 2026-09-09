import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type {
  OnboardingDashboardRow,
  OnboardingProcess,
  OnboardingTemplate,
  OnboardingTemplateItem,
} from "../entities/Onboarding";
import type {
  CreateOnboardingTemplateInput,
  CreateTemplateItemInput,
  IOnboardingProcessRepository,
  IOnboardingTemplateRepository,
} from "../repositories/IOnboardingRepository";

export type OnboardingActor = {
  readonly userId: string;
  readonly employeeId: string;
  readonly permissionKeys: readonly string[];
};

/**
 * Creates an onboarding checklist template.
 */
export class CreateOnboardingTemplateUseCase {
  constructor(
    private readonly templates: IOnboardingTemplateRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: CreateOnboardingTemplateInput, actorUserId: string): Promise<OnboardingTemplate> {
    const template = await this.templates.create(input);
    await this.audit.append({
      actorUserId,
      entityType: "OnboardingTemplate",
      entityId: template.id,
      action: "create",
    });
    return template;
  }
}

/**
 * Updates an onboarding template.
 */
export class UpdateOnboardingTemplateUseCase {
  constructor(private readonly templates: IOnboardingTemplateRepository) {}

  async execute(
    id: string,
    input: Partial<CreateOnboardingTemplateInput>,
  ): Promise<OnboardingTemplate> {
    const current = await this.templates.findById(id);
    if (!current) {
      throw new NotFoundError("Onboarding template not found");
    }
    return this.templates.update(id, input);
  }
}

/**
 * Lists onboarding templates.
 */
export class ListOnboardingTemplatesUseCase {
  constructor(private readonly templates: IOnboardingTemplateRepository) {}

  execute() {
    return this.templates.list();
  }
}

/**
 * Adds an item to an onboarding template.
 */
export class AddOnboardingTemplateItemUseCase {
  constructor(private readonly templates: IOnboardingTemplateRepository) {}

  async execute(input: CreateTemplateItemInput): Promise<OnboardingTemplateItem> {
    const template = await this.templates.findById(input.templateId);
    if (!template) {
      throw new NotFoundError("Onboarding template not found");
    }
    return this.templates.addItem(input);
  }
}

/**
 * Updates a template item.
 */
export class UpdateOnboardingTemplateItemUseCase {
  constructor(private readonly templates: IOnboardingTemplateRepository) {}

  execute(id: string, input: Partial<Omit<CreateTemplateItemInput, "templateId">>) {
    return this.templates.updateItem(id, input);
  }
}

/**
 * Deletes a template item.
 */
export class DeleteOnboardingTemplateItemUseCase {
  constructor(private readonly templates: IOnboardingTemplateRepository) {}

  execute(id: string) {
    return this.templates.deleteItem(id);
  }
}

/**
 * Clones a position (or default) template into a process for a new hire.
 */
export class StartOnboardingProcessUseCase {
  constructor(
    private readonly templates: IOnboardingTemplateRepository,
    private readonly processes: IOnboardingProcessRepository,
  ) {}

  async execute(input: {
    readonly employeeId: string;
    readonly positionId: string;
    readonly managerId: string | null;
  }): Promise<OnboardingProcess | null> {
    const existing = await this.processes.findByEmployeeId(input.employeeId);
    if (existing) {
      return existing;
    }
    const template = await this.templates.findForPosition(input.positionId);
    if (!template) {
      return null;
    }
    return this.processes.createFromTemplate({
      employeeId: input.employeeId,
      template,
      managerId: input.managerId,
    });
  }
}

/**
 * Returns the onboarding process for an employee.
 */
export class GetOnboardingProcessUseCase {
  constructor(private readonly processes: IOnboardingProcessRepository) {}

  async execute(employeeId: string): Promise<OnboardingProcess> {
    const process = await this.processes.findByEmployeeId(employeeId);
    if (!process) {
      throw new NotFoundError("Onboarding process not found");
    }
    return process;
  }
}

/**
 * Completes an onboarding task when the actor is assigned.
 */
export class CompleteOnboardingTaskUseCase {
  constructor(
    private readonly processes: IOnboardingProcessRepository,
    private readonly employees: IEmployeeRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(taskId: string, actor: OnboardingActor): Promise<OnboardingProcess> {
    const process = await this.processes.findTaskById(taskId);
    if (!process) {
      throw new NotFoundError("Onboarding task not found");
    }
    const task = process.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new NotFoundError("Onboarding task not found");
    }
    if (task.completedAt) {
      return process;
    }
    await this.assertCanComplete(process, task, actor);
    const updated = await this.processes.completeTask(taskId, this.clock());
    if (updated.tasks.every((item) => item.completedAt !== null)) {
      return this.processes.markCompleted(updated.id);
    }
    return updated;
  }

  private async assertCanComplete(
    process: OnboardingProcess,
    task: OnboardingProcess["tasks"][number],
    actor: OnboardingActor,
  ): Promise<void> {
    if (task.assigneeEmployeeId) {
      if (task.assigneeEmployeeId !== actor.employeeId) {
        throw new ForbiddenError("Task is assigned to another employee");
      }
      return;
    }
    if (task.assigneeKind === "NEW_HIRE") {
      if (process.employeeId !== actor.employeeId) {
        throw new ForbiddenError("Only the new hire can complete this task");
      }
      return;
    }
    if (task.assigneeKind === "MANAGER") {
      const hire = await this.employees.findById(process.employeeId);
      if (hire?.managerId !== actor.employeeId) {
        throw new ForbiddenError("Only the hiring manager can complete this task");
      }
      return;
    }
    if (!actor.permissionKeys.includes(PERMISSIONS.ONBOARDING_TASKS_COMPLETE)) {
      throw new ForbiddenError("Missing permission to complete this task");
    }
  }
}

/**
 * Lists onboarding progress for the HR dashboard.
 */
export class ListOnboardingDashboardUseCase {
  constructor(private readonly processes: IOnboardingProcessRepository) {}

  execute(pagination: import("../../../../shared/utils/pagination").PaginationParams) {
    return this.processes.listDashboard(pagination);
  }
}
