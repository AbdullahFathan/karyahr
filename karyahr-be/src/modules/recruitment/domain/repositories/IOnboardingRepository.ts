import type {
  OnboardingAssigneeKind,
  OnboardingDashboardRow,
  OnboardingProcess,
  OnboardingTemplate,
  OnboardingTemplateItem,
} from "../entities/Onboarding";

export type CreateOnboardingTemplateInput = {
  readonly name: string;
  readonly positionId: string | null;
};

export type CreateTemplateItemInput = {
  readonly templateId: string;
  readonly title: string;
  readonly description: string;
  readonly assigneeKind: OnboardingAssigneeKind;
  readonly sortOrder: number;
};

export type IOnboardingTemplateRepository = {
  create(input: CreateOnboardingTemplateInput): Promise<OnboardingTemplate>;
  update(
    id: string,
    input: Partial<CreateOnboardingTemplateInput>,
  ): Promise<OnboardingTemplate>;
  findById(id: string): Promise<OnboardingTemplate | null>;
  list(): Promise<readonly OnboardingTemplate[]>;
  findForPosition(positionId: string): Promise<OnboardingTemplate | null>;
  addItem(input: CreateTemplateItemInput): Promise<OnboardingTemplateItem>;
  updateItem(
    id: string,
    input: Partial<Omit<CreateTemplateItemInput, "templateId">>,
  ): Promise<OnboardingTemplateItem>;
  deleteItem(id: string): Promise<void>;
};

export type IOnboardingProcessRepository = {
  createFromTemplate(input: {
    readonly employeeId: string;
    readonly template: OnboardingTemplate;
    readonly managerId: string | null;
  }): Promise<OnboardingProcess>;
  findByEmployeeId(employeeId: string): Promise<OnboardingProcess | null>;
  findById(id: string): Promise<OnboardingProcess | null>;
  findTaskById(taskId: string): Promise<OnboardingProcess | null>;
  completeTask(taskId: string, completedAt: Date): Promise<OnboardingProcess>;
  markCompleted(processId: string): Promise<OnboardingProcess>;
  listDashboard(): Promise<readonly OnboardingDashboardRow[]>;
};
