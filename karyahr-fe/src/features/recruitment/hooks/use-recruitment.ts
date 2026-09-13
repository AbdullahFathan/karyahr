import { useMutation, useQuery } from '@tanstack/react-query'
import {
  addApplicationNote,
  applyToCareer,
  createJob,
  getApplication,
  getJob,
  getPublicCareer,
  hireApplication,
  listJobApplications,
  listJobs,
  listPublicCareers,
  moveApplicationStage,
  rejectApplication,
  replaceJobStages,
  updateJob,
} from '@/features/recruitment/api/recruitment'
import type { JobListFilters } from '@/features/recruitment/types'
import type { CareerApplyFormInput, HireCandidateFormInput, JobPostingFormInput } from '@/features/recruitment/schema'
import type { PaginationQuery } from '@/types/api'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

function invalidateRecruitment() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.recruitment.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.careers.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
  ])
}

export function useJobs(filters: JobListFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.recruitment.jobs(filters),
    queryFn: () => listJobs(filters),
    enabled,
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.recruitment.job(id),
    queryFn: () => getJob(id),
    enabled: Boolean(id),
  })
}

export function useCreateJob() {
  return useMutation({
    mutationFn: createJob,
    onSuccess: invalidateRecruitment,
  })
}

export function useUpdateJob(id: string) {
  return useMutation({
    mutationFn: async (input: JobPostingFormInput) => {
      const job = await updateJob(id, input)
      const stages = input.stages.filter((stage) => stage.name.trim().length > 0)
      if (stages.length > 0) {
        await replaceJobStages(id, stages)
      }
      return job
    },
    onSuccess: invalidateRecruitment,
  })
}

export function useReplaceJobStages(jobId: string) {
  return useMutation({
    mutationFn: (
      stages: readonly { readonly id?: string; readonly name: string; readonly isTerminal: boolean }[],
    ) => replaceJobStages(jobId, stages),
    onSuccess: invalidateRecruitment,
  })
}

export function useJobApplications(jobId: string, query: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.recruitment.applications(jobId, query),
    queryFn: () => listJobApplications(jobId, query),
    enabled: Boolean(jobId),
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.recruitment.application(id),
    queryFn: () => getApplication(id),
    enabled: Boolean(id),
  })
}

export function useAddApplicationNote(id: string) {
  return useMutation({
    mutationFn: (input: { readonly body: string; readonly rating?: number | null }) =>
      addApplicationNote(id, input),
    onSuccess: invalidateRecruitment,
  })
}

export function useMoveApplicationStage(id: string) {
  return useMutation({
    mutationFn: (stageId: string) => moveApplicationStage(id, stageId),
    onSuccess: invalidateRecruitment,
  })
}

export function useRejectApplication(id: string) {
  return useMutation({
    mutationFn: () => rejectApplication(id),
    onSuccess: invalidateRecruitment,
  })
}

export function useHireApplication(id: string) {
  return useMutation({
    mutationFn: (input: HireCandidateFormInput) => hireApplication(id, input),
    onSuccess: invalidateRecruitment,
  })
}

export function usePublicCareers() {
  return useQuery({
    queryKey: queryKeys.careers.list,
    queryFn: listPublicCareers,
  })
}

export function usePublicCareer(slug: string) {
  return useQuery({
    queryKey: queryKeys.careers.detail(slug),
    queryFn: () => getPublicCareer(slug),
    enabled: Boolean(slug),
  })
}

export function useApplyToCareer(slug: string) {
  return useMutation({
    mutationFn: (input: CareerApplyFormInput) => applyToCareer(slug, input),
  })
}
