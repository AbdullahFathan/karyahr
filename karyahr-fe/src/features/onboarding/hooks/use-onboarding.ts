import { useMutation, useQuery } from '@tanstack/react-query'
import {
  addOnboardingTemplateItem,
  completeOnboardingTask,
  createOnboardingTemplate,
  deleteOnboardingTemplateItem,
  getMyOnboardingProcess,
  getOnboardingProcess,
  listOnboardingDashboard,
  listOnboardingTemplates,
  updateOnboardingTemplate,
  updateOnboardingTemplateItem,
} from '@/features/onboarding/api/onboarding'
import type { OnboardingItemFormInput, OnboardingTemplateFormInput } from '@/features/onboarding/schema'
import type { PaginationQuery } from '@/types/api'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

function invalidateOnboarding() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all })
}

export function useOnboardingTemplates() {
  return useQuery({
    queryKey: queryKeys.onboarding.templates,
    queryFn: listOnboardingTemplates,
  })
}

export function useCreateOnboardingTemplate() {
  return useMutation({
    mutationFn: createOnboardingTemplate,
    onSuccess: invalidateOnboarding,
  })
}

export function useUpdateOnboardingTemplate() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OnboardingTemplateFormInput> }) =>
      updateOnboardingTemplate(id, input),
    onSuccess: invalidateOnboarding,
  })
}

export function useAddOnboardingTemplateItem() {
  return useMutation({
    mutationFn: ({ templateId, input }: { templateId: string; input: OnboardingItemFormInput }) =>
      addOnboardingTemplateItem(templateId, input),
    onSuccess: invalidateOnboarding,
  })
}

export function useUpdateOnboardingTemplateItem() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OnboardingItemFormInput> }) =>
      updateOnboardingTemplateItem(id, input),
    onSuccess: invalidateOnboarding,
  })
}

export function useDeleteOnboardingTemplateItem() {
  return useMutation({
    mutationFn: deleteOnboardingTemplateItem,
    onSuccess: invalidateOnboarding,
  })
}

export function useOnboardingDashboard(query: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.onboarding.dashboard(query),
    queryFn: () => listOnboardingDashboard(query),
  })
}

export function useMyOnboardingProcess() {
  return useQuery({
    queryKey: queryKeys.onboarding.me,
    queryFn: getMyOnboardingProcess,
  })
}

export function useOnboardingProcess(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.onboarding.process(employeeId),
    queryFn: () => getOnboardingProcess(employeeId),
    enabled: Boolean(employeeId),
  })
}

export function useCompleteOnboardingTask() {
  return useMutation({
    mutationFn: completeOnboardingTask,
    onSuccess: invalidateOnboarding,
  })
}
