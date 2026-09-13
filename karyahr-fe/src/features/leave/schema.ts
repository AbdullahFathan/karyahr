import { z } from 'zod'

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const leaveTypeFormSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  requiresBalance: z.boolean(),
  requiresAttachment: z.boolean(),
  isActive: z.boolean(),
})

export const leavePolicyFormSchema = z.object({
  leaveTypeId: z.string().min(1),
  departmentId: z.string().nullable(),
  positionId: z.string().nullable(),
  annualAllowanceDays: z.coerce.number().int().min(0),
  approvalLevelCount: z.coerce.number().int().min(1).max(2),
  accrualPerMonth: z.coerce.number().int().min(0),
})

export const leaveRequestFormSchema = z
  .object({
    leaveTypeId: z.string().min(1),
    startDate: dateKey,
    endDate: dateKey,
    reason: z.string().min(1),
    file: z.instanceof(File).optional(),
    requiresAttachment: z.boolean(),
  })
  .refine((value) => !value.requiresAttachment || Boolean(value.file), {
    message: 'Attachment is required for this leave type',
    path: ['file'],
  })

export type LeaveTypeFormInput = z.infer<typeof leaveTypeFormSchema>
export type LeavePolicyFormInput = z.infer<typeof leavePolicyFormSchema>
export type LeaveRequestFormInput = z.infer<typeof leaveRequestFormSchema>
