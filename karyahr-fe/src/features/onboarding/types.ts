export const ONBOARDING_ASSIGNEE_KINDS = ['NEW_HIRE', 'HR', 'MANAGER', 'IT', 'FINANCE'] as const
export type OnboardingAssigneeKind = (typeof ONBOARDING_ASSIGNEE_KINDS)[number]

export const ONBOARDING_PROCESS_STATUSES = ['IN_PROGRESS', 'COMPLETED'] as const
export type OnboardingProcessStatus = (typeof ONBOARDING_PROCESS_STATUSES)[number]

export type OnboardingTemplateItem = {
  readonly id: string
  readonly templateId: string
  readonly title: string
  readonly description: string
  readonly assigneeKind: OnboardingAssigneeKind
  readonly sortOrder: number
}

export type OnboardingTemplate = {
  readonly id: string
  readonly name: string
  readonly positionId: string | null
  readonly items: readonly OnboardingTemplateItem[]
}

export type OnboardingTask = {
  readonly id: string
  readonly processId: string
  readonly title: string
  readonly description: string
  readonly assigneeKind: OnboardingAssigneeKind
  readonly assigneeEmployeeId: string | null
  readonly sortOrder: number
  readonly completedAt: string | null
}

export type OnboardingProcess = {
  readonly id: string
  readonly employeeId: string
  readonly templateId: string
  readonly status: OnboardingProcessStatus
  readonly tasks: readonly OnboardingTask[]
}

export type OnboardingDashboardRow = {
  readonly employeeId: string
  readonly processId: string
  readonly status: OnboardingProcessStatus
  readonly completedCount: number
  readonly totalCount: number
  readonly progress: number
}
