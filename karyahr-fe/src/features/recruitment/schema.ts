import { z } from 'zod'
import { CONTRACT_TYPES } from '@/features/employees/types'
import { JOB_POSTING_STATUSES } from '@/features/recruitment/types'

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const jobStageDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  isTerminal: z.boolean(),
})

export const jobPostingFormSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().min(1),
  qualifications: z.string().min(1),
  departmentId: z.string().min(1),
  positionId: z.string().min(1),
  headcount: z.number().int().min(1),
  maxApplicants: z.number().int().min(1),
  closesAt: z.union([dateKey, z.literal('')]).optional(),
  status: z.enum(JOB_POSTING_STATUSES),
  stages: z.array(jobStageDraftSchema),
})

export const careerApplyFormSchema = z.object({
  fullName: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
  nationalId: z.string().optional(),
  file: z.instanceof(File).optional(),
})

export const applicationNoteFormSchema = z.object({
  body: z.string().min(1),
  rating: z.union([z.literal(''), z.coerce.number().int().min(1).max(5)]),
})

export const hireCandidateFormSchema = z.object({
  nationalId: z.string().optional(),
  birthDate: dateKey,
  address: z.string().min(1),
  phone: z.string().optional(),
  emergencyContact: z.string().min(1),
  employeeNumber: z.string().optional(),
  managerId: z.string().nullable().optional(),
  joinedAt: dateKey,
  contractType: z.enum(CONTRACT_TYPES),
})

export type JobPostingFormInput = z.infer<typeof jobPostingFormSchema>
export type CareerApplyFormInput = z.infer<typeof careerApplyFormSchema>
export type ApplicationNoteFormInput = z.infer<typeof applicationNoteFormSchema>
export type HireCandidateFormInput = z.infer<typeof hireCandidateFormSchema>
