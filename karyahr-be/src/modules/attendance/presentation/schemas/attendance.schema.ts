import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createShiftSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  startMinutes: z.number().int().min(0).max(1439),
  endMinutes: z.number().int().min(0).max(1439),
  graceMinutesLate: z.number().int().min(0).max(180).default(0),
  graceMinutesEarly: z.number().int().min(0).max(180).default(0),
  overtimeCapMinutes: z.number().int().min(0).max(720).default(0),
  isFlexible: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateShiftSchema = createShiftSchema.partial();

export const assignShiftSchema = z.object({
  employeeId: z.string().min(1),
  effectiveFrom: dateKey,
});

export const attendanceRangeQuerySchema = z.object({
  from: dateKey,
  to: dateKey,
});

export const attendanceDashboardQuerySchema = z.object({
  departmentId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const attendanceSummaryQuerySchema = z.object({
  employeeId: z.string().min(1).optional(),
  period: z.enum(["day", "week", "month"]).default("month"),
  from: dateKey.optional(),
  to: dateKey.optional(),
});

export type CreateShiftDto = z.infer<typeof createShiftSchema>;
export type UpdateShiftDto = z.infer<typeof updateShiftSchema>;
export type AssignShiftDto = z.infer<typeof assignShiftSchema>;
export type AttendanceRangeQueryDto = z.infer<typeof attendanceRangeQuerySchema>;
export type AttendanceDashboardQueryDto = z.infer<typeof attendanceDashboardQuerySchema>;
export type AttendanceSummaryQueryDto = z.infer<typeof attendanceSummaryQuerySchema>;
