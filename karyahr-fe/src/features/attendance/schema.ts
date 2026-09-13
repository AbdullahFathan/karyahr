import { z } from 'zod'
import { ATTENDANCE_SUMMARY_PERIODS } from '@/features/attendance/types'

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const shiftFormSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  startMinutes: z.coerce.number().int().min(0).max(1439),
  endMinutes: z.coerce.number().int().min(0).max(1439),
  graceMinutesLate: z.coerce.number().int().min(0).max(180),
  graceMinutesEarly: z.coerce.number().int().min(0).max(180),
  overtimeCapMinutes: z.coerce.number().int().min(0).max(720),
  isFlexible: z.boolean(),
  isActive: z.boolean(),
})

export const assignShiftSchema = z.object({
  employeeId: z.string().min(1),
  effectiveFrom: dateKey,
})

export const attendanceRangeSchema = z.object({
  from: dateKey,
  to: dateKey,
})

export const attendanceSummaryFilterSchema = z
  .object({
    period: z.enum(ATTENDANCE_SUMMARY_PERIODS),
    employeeId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .refine((value) => Boolean(value.from) === Boolean(value.to), {
    message: 'from and to must be provided together',
  })

export type ShiftFormInput = z.infer<typeof shiftFormSchema>
export type AssignShiftInput = z.infer<typeof assignShiftSchema>
