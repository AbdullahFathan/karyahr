import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { toPaginationQuery } from '@/lib/pagination'
import type { ApiEnvelope, Paginated, PaginationQuery } from '@/types/api'
import type {
  ApplicationDetail,
  ApplicationNote,
  HireResult,
  JobListFilters,
  JobPipelineStage,
  JobPostingDetail,
} from '@/features/recruitment/types'
import type { CareerApplyFormInput, HireCandidateFormInput, JobPostingFormInput } from '@/features/recruitment/schema'

function jobPayload(input: JobPostingFormInput) {
  const stages = input.stages.filter((stage) => stage.name.trim().length > 0)
  return {
    title: input.title,
    slug: input.slug?.trim() ? input.slug.trim() : undefined,
    description: input.description,
    qualifications: input.qualifications,
    departmentId: input.departmentId,
    positionId: input.positionId,
    headcount: input.headcount,
    maxApplicants: input.maxApplicants,
    closesAt: input.closesAt ? input.closesAt : null,
    status: input.status,
    stages: stages.length > 0 ? stages : undefined,
  }
}

export async function listJobs(filters: JobListFilters = {}): Promise<Paginated<JobPostingDetail>> {
  const pagination = toPaginationQuery(filters)
  const { data } = await apiClient.get<Paginated<JobPostingDetail>>(endpoints.recruitment.jobs, {
    params: {
      ...pagination,
      status: filters.status || undefined,
    },
  })
  return data
}

export async function getJob(id: string): Promise<JobPostingDetail> {
  const { data } = await apiClient.get<ApiEnvelope<JobPostingDetail>>(endpoints.recruitment.job(id))
  return data.data
}

export async function createJob(input: JobPostingFormInput): Promise<JobPostingDetail> {
  const { data } = await apiClient.post<ApiEnvelope<JobPostingDetail>>(
    endpoints.recruitment.jobs,
    jobPayload(input),
  )
  return data.data
}

export async function updateJob(id: string, input: JobPostingFormInput): Promise<JobPostingDetail> {
  const payload = jobPayload(input)
  const { data } = await apiClient.patch<ApiEnvelope<JobPostingDetail>>(endpoints.recruitment.job(id), {
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    qualifications: payload.qualifications,
    departmentId: payload.departmentId,
    positionId: payload.positionId,
    headcount: payload.headcount,
    maxApplicants: payload.maxApplicants,
    closesAt: payload.closesAt,
    status: payload.status,
  })
  return data.data
}

export async function replaceJobStages(
  id: string,
  stages: readonly { readonly id?: string; readonly name: string; readonly isTerminal: boolean }[],
): Promise<readonly JobPipelineStage[]> {
  const { data } = await apiClient.put<ApiEnvelope<readonly JobPipelineStage[]>>(
    endpoints.recruitment.jobStages(id),
    { stages },
  )
  return data.data
}

export async function listJobApplications(
  jobId: string,
  query: PaginationQuery = {},
): Promise<Paginated<ApplicationDetail>> {
  const pagination = toPaginationQuery(query)
  const { data } = await apiClient.get<Paginated<ApplicationDetail>>(
    endpoints.recruitment.jobApplications(jobId),
    { params: pagination },
  )
  return data
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  const { data } = await apiClient.get<ApiEnvelope<ApplicationDetail>>(endpoints.recruitment.application(id))
  return data.data
}

export async function addApplicationNote(
  id: string,
  input: { readonly body: string; readonly rating?: number | null },
): Promise<ApplicationNote> {
  const { data } = await apiClient.post<ApiEnvelope<ApplicationNote>>(
    endpoints.recruitment.applicationNotes(id),
    input,
  )
  return data.data
}

export async function moveApplicationStage(id: string, stageId: string): Promise<ApplicationDetail> {
  const { data } = await apiClient.post<ApiEnvelope<ApplicationDetail>>(
    endpoints.recruitment.applicationStage(id),
    { stageId },
  )
  return data.data
}

export async function rejectApplication(id: string): Promise<ApplicationDetail> {
  const { data } = await apiClient.post<ApiEnvelope<ApplicationDetail>>(
    endpoints.recruitment.applicationReject(id),
  )
  return data.data
}

export async function hireApplication(id: string, input: HireCandidateFormInput): Promise<HireResult> {
  const { data } = await apiClient.post<ApiEnvelope<HireResult>>(endpoints.recruitment.applicationHire(id), {
    nationalId: input.nationalId || undefined,
    birthDate: input.birthDate,
    address: input.address,
    phone: input.phone || undefined,
    emergencyContact: input.emergencyContact,
    employeeNumber: input.employeeNumber || undefined,
    managerId: input.managerId || null,
    joinedAt: input.joinedAt,
    contractType: input.contractType,
  })
  return data.data
}

export async function listPublicCareers(): Promise<readonly JobPostingDetail[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly JobPostingDetail[]>>(endpoints.careers)
  return data.data
}

export async function getPublicCareer(slug: string): Promise<JobPostingDetail> {
  const { data } = await apiClient.get<ApiEnvelope<JobPostingDetail>>(endpoints.career(slug))
  return data.data
}

export async function applyToCareer(slug: string, input: CareerApplyFormInput): Promise<ApplicationDetail> {
  const form = new FormData()
  form.append('fullName', input.fullName)
  form.append('email', input.email)
  form.append('phone', input.phone)
  if (input.nationalId) {
    form.append('nationalId', input.nationalId)
  }
  if (input.file) {
    form.append('file', input.file)
  }
  const { data } = await apiClient.post<ApiEnvelope<ApplicationDetail>>(endpoints.careerApply(slug), form)
  return data.data
}
