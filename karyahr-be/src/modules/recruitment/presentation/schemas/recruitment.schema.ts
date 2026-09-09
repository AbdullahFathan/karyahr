import { z } from "zod";
import { CONTRACT_TYPES } from "../../../employees/domain/entities/Employee";
import { JOB_POSTING_STATUSES } from "../../domain/entities/Recruitment";
import { ONBOARDING_ASSIGNEE_KINDS } from "../../domain/entities/Onboarding";

export const createJobPostingSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().min(1),
  qualifications: z.string().min(1),
  departmentId: z.string().min(1),
  positionId: z.string().min(1),
  headcount: z.number().int().min(1).default(1),
  maxApplicants: z.number().int().min(1),
  closesAt: z.coerce.date().nullable().optional(),
  status: z.enum(JOB_POSTING_STATUSES).optional(),
  stages: z
    .array(z.object({ name: z.string().min(1), isTerminal: z.boolean().optional() }))
    .optional(),
});

export const updateJobPostingSchema = createJobPostingSchema.partial();

export const listJobsQuerySchema = z.object({
  status: z.enum(JOB_POSTING_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const replaceStagesSchema = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().min(1).optional(),
        name: z.string().min(1),
        isTerminal: z.boolean().default(false),
      }),
    )
    .min(1),
});

export const applySchema = z.object({
  fullName: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
  nationalId: z.string().min(1).optional(),
  jobPostingId: z.string().min(1).optional(),
});

export const moveStageSchema = z.object({
  stageId: z.string().min(1),
});

export const addNoteSchema = z.object({
  body: z.string().min(1),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

export const hireCandidateSchema = z.object({
  nationalId: z.string().min(1).optional(),
  birthDate: z.coerce.date(),
  address: z.string().min(1),
  phone: z.string().min(1).optional(),
  emergencyContact: z.string().min(1),
  employeeNumber: z.string().min(1).optional(),
  managerId: z.string().min(1).nullable().optional(),
  joinedAt: z.coerce.date(),
  contractType: z.enum(CONTRACT_TYPES),
});

export const createOnboardingTemplateSchema = z.object({
  name: z.string().min(1),
  positionId: z.string().min(1).nullable().optional(),
});

export const updateOnboardingTemplateSchema = createOnboardingTemplateSchema.partial();

export const createOnboardingItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  assigneeKind: z.enum(ONBOARDING_ASSIGNEE_KINDS),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateOnboardingItemSchema = createOnboardingItemSchema.partial();

export type CreateJobPostingDto = z.infer<typeof createJobPostingSchema>;
export type UpdateJobPostingDto = z.infer<typeof updateJobPostingSchema>;
export type ApplyDto = z.infer<typeof applySchema>;
export type HireCandidateDto = z.infer<typeof hireCandidateSchema>;
