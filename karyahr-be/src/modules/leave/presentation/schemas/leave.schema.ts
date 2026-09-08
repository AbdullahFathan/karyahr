import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createLeaveTypeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  requiresBalance: z.boolean().default(true),
  requiresAttachment: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();

export const createLeavePolicySchema = z.object({
  leaveTypeId: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  positionId: z.string().nullable().optional(),
  annualAllowanceDays: z.number().int().min(0),
  approvalLevelCount: z.number().int().min(1).max(2).default(2),
  accrualPerMonth: z.number().int().min(0).default(0),
});

export const updateLeavePolicySchema = createLeavePolicySchema.omit({ leaveTypeId: true }).partial();

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: dateKey,
  endDate: dateKey,
  reason: z.string().min(1),
});

export const reviewLeaveSchema = z.object({
  comment: z.string().min(1).nullable().optional(),
});

export type CreateLeaveTypeDto = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeDto = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeavePolicyDto = z.infer<typeof createLeavePolicySchema>;
export type UpdateLeavePolicyDto = z.infer<typeof updateLeavePolicySchema>;
export type CreateLeaveRequestDto = z.infer<typeof createLeaveRequestSchema>;
export type ReviewLeaveDto = z.infer<typeof reviewLeaveSchema>;
