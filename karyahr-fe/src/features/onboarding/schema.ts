import { z } from 'zod'
import { ONBOARDING_ASSIGNEE_KINDS } from '@/features/onboarding/types'

export const onboardingTemplateFormSchema = z.object({
  name: z.string().min(1),
  positionId: z.string().nullable().optional(),
})

export const onboardingItemFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  assigneeKind: z.enum(ONBOARDING_ASSIGNEE_KINDS),
  sortOrder: z.number().int().min(0),
})

export type OnboardingTemplateFormInput = z.infer<typeof onboardingTemplateFormSchema>
export type OnboardingItemFormInput = z.infer<typeof onboardingItemFormSchema>
