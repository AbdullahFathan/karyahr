import { z } from "zod";
import {
  GOAL_LEVELS,
  GOAL_STATUSES,
  PERFORMANCE_PERIOD_TYPES,
  PERFORMANCE_RATER_TYPES,
} from "../../domain/entities/Performance";

const keyResultSchema = z.object({
  title: z.string().min(1),
  targetValue: z.number().positive(),
  currentValue: z.number().min(0).optional(),
  weight: z.number().int().min(0).max(100),
});

export const createGoalSchema = z.object({
  level: z.enum(GOAL_LEVELS),
  parentGoalId: z.string().min(1).nullable().optional(),
  departmentId: z.string().min(1).nullable().optional(),
  employeeId: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  keyResults: z.array(keyResultSchema).optional(),
});

export const updateGoalSchema = z.object({
  parentGoalId: z.string().min(1).nullable().optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  keyResults: z.array(keyResultSchema).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
});

export const updateProgressSchema = z.object({
  keyResults: z.array(keyResultSchema).min(1),
});

export const listGoalsQuerySchema = z.object({
  employeeId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  level: z.enum(GOAL_LEVELS).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  parentGoalId: z.string().min(1).optional(),
});

export const createCycleSchema = z.object({
  name: z.string().min(1),
  periodType: z.enum(PERFORMANCE_PERIOD_TYPES),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export const updateCycleSchema = createCycleSchema.partial();

export const assignPeersSchema = z.object({
  peerEmployeeIds: z.array(z.string().min(1)),
});

export const submitRatingSchema = z.object({
  raterType: z.enum(PERFORMANCE_RATER_TYPES),
  score: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});

export const dashboardQuerySchema = z.object({
  cycleId: z.string().min(1),
  managerId: z.string().min(1).optional(),
});

export type CreateGoalDto = z.infer<typeof createGoalSchema>;
export type UpdateGoalDto = z.infer<typeof updateGoalSchema>;
export type CreateCycleDto = z.infer<typeof createCycleSchema>;
export type UpdateCycleDto = z.infer<typeof updateCycleSchema>;
export type SubmitRatingDto = z.infer<typeof submitRatingSchema>;
