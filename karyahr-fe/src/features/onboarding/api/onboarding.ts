import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { toPaginationQuery } from '@/lib/pagination'
import type { ApiEnvelope, Paginated, PaginationQuery } from '@/types/api'
import type {
  OnboardingDashboardRow,
  OnboardingProcess,
  OnboardingTemplate,
  OnboardingTemplateItem,
} from '@/features/onboarding/types'
import type { OnboardingItemFormInput, OnboardingTemplateFormInput } from '@/features/onboarding/schema'

export async function listOnboardingTemplates(): Promise<readonly OnboardingTemplate[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly OnboardingTemplate[]>>(
    endpoints.onboarding.templates,
  )
  return data.data
}

export async function createOnboardingTemplate(
  input: OnboardingTemplateFormInput,
): Promise<OnboardingTemplate> {
  const { data } = await apiClient.post<ApiEnvelope<OnboardingTemplate>>(endpoints.onboarding.templates, {
    name: input.name,
    positionId: input.positionId ?? null,
  })
  return data.data
}

export async function updateOnboardingTemplate(
  id: string,
  input: Partial<OnboardingTemplateFormInput>,
): Promise<OnboardingTemplate> {
  const { data } = await apiClient.patch<ApiEnvelope<OnboardingTemplate>>(
    endpoints.onboarding.template(id),
    input,
  )
  return data.data
}

export async function addOnboardingTemplateItem(
  templateId: string,
  input: OnboardingItemFormInput,
): Promise<OnboardingTemplateItem> {
  const { data } = await apiClient.post<ApiEnvelope<OnboardingTemplateItem>>(
    endpoints.onboarding.templateItems(templateId),
    input,
  )
  return data.data
}

export async function updateOnboardingTemplateItem(
  id: string,
  input: Partial<OnboardingItemFormInput>,
): Promise<OnboardingTemplateItem> {
  const { data } = await apiClient.patch<ApiEnvelope<OnboardingTemplateItem>>(
    endpoints.onboarding.item(id),
    input,
  )
  return data.data
}

export async function deleteOnboardingTemplateItem(id: string): Promise<void> {
  await apiClient.delete(endpoints.onboarding.item(id))
}

export async function listOnboardingDashboard(
  query: PaginationQuery = {},
): Promise<Paginated<OnboardingDashboardRow>> {
  const pagination = toPaginationQuery(query)
  const { data } = await apiClient.get<Paginated<OnboardingDashboardRow>>(endpoints.onboarding.dashboard, {
    params: pagination,
  })
  return data
}

export async function getMyOnboardingProcess(): Promise<OnboardingProcess> {
  const { data } = await apiClient.get<ApiEnvelope<OnboardingProcess>>(endpoints.onboarding.me)
  return data.data
}

export async function getOnboardingProcess(employeeId: string): Promise<OnboardingProcess> {
  const { data } = await apiClient.get<ApiEnvelope<OnboardingProcess>>(
    endpoints.onboarding.process(employeeId),
  )
  return data.data
}

export async function completeOnboardingTask(id: string): Promise<OnboardingProcess> {
  const { data } = await apiClient.post<ApiEnvelope<OnboardingProcess>>(
    endpoints.onboarding.completeTask(id),
  )
  return data.data
}
