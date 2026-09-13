import { z } from 'zod'
import {
  GOAL_LEVELS,
  PERFORMANCE_PERIOD_TYPES,
  PERFORMANCE_RATER_TYPES,
} from '@/features/performance/types'

export const keyResultInputSchema = z.object({
  title: z.string().min(1),
  targetValue: z.coerce.number().positive(),
  currentValue: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().int().min(0).max(100),
})

function keyResultsSumTo100(keyResults: readonly { readonly weight: number }[] | undefined) {
  if (!keyResults || keyResults.length === 0) {
    return true
  }
  const sum = keyResults.reduce((total, item) => total + item.weight, 0)
  return sum === 100
}

export const createGoalSchema = z
  .object({
    level: z.enum(GOAL_LEVELS),
    parentGoalId: z.string().min(1).nullable().optional(),
    departmentId: z.string().min(1).nullable().optional(),
    employeeId: z.string().min(1).nullable().optional(),
    title: z.string().min(1),
    description: z.string().min(1),
    keyResults: z.array(keyResultInputSchema).optional(),
  })
  .refine((value) => keyResultsSumTo100(value.keyResults), {
    message: 'Key result weights must sum to 100',
    path: ['keyResults'],
  })
  .refine((value) => value.level !== 'DEPARTMENT' || Boolean(value.departmentId), {
    message: 'Department is required for DEPARTMENT goals',
    path: ['departmentId'],
  })
  .refine((value) => value.level !== 'EMPLOYEE' || Boolean(value.employeeId), {
    message: 'Employee is required for EMPLOYEE goals',
    path: ['employeeId'],
  })

export const updateProgressSchema = z
  .object({
    keyResults: z.array(keyResultInputSchema).min(1),
  })
  .refine((value) => keyResultsSumTo100(value.keyResults), {
    message: 'Key result weights must sum to 100',
    path: ['keyResults'],
  })

export const createCycleSchema = z.object({
  name: z.string().min(1),
  periodType: z.enum(PERFORMANCE_PERIOD_TYPES),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
})

export const submitRatingSchema = z.object({
  raterType: z.enum(PERFORMANCE_RATER_TYPES),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1),
})

export type CreateGoalFormInput = z.infer<typeof createGoalSchema>
export type UpdateProgressFormInput = z.infer<typeof updateProgressSchema>
export type CreateCycleFormInput = z.infer<typeof createCycleSchema>
export type SubmitRatingFormInput = z.infer<typeof submitRatingSchema>
export type KeyResultFormInput = z.infer<typeof keyResultInputSchema>
