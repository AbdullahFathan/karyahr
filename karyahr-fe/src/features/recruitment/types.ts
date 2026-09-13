export const JOB_POSTING_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'] as const
export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number]

export const APPLICATION_STATUSES = ['ACTIVE', 'HIRED', 'REJECTED', 'WITHDRAWN'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export type JobPipelineStage = {
  readonly id: string
  readonly jobPostingId: string
  readonly name: string
  readonly sortOrder: number
  readonly isTerminal: boolean
}

export type JobPostingDetail = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly description: string
  readonly qualifications: string
  readonly departmentId: string
  readonly positionId: string
  readonly headcount: number
  readonly maxApplicants: number
  readonly closesAt: string | null
  readonly status: JobPostingStatus
  readonly createdByUserId: string
  readonly stages: readonly JobPipelineStage[]
  readonly applicationCount: number
}

export type Candidate = {
  readonly id: string
  readonly fullName: string
  readonly email: string
  readonly phone: string
  readonly nationalId: string | null
}

export type ApplicationNote = {
  readonly id: string
  readonly applicationId: string
  readonly authorUserId: string
  readonly body: string
  readonly rating: number | null
}

export type ApplicationAttachment = {
  readonly id: string
  readonly applicationId: string
  readonly fileName: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly objectKey: string
  readonly uploadedByUserId: string | null
}

export type ApplicationDetail = {
  readonly id: string
  readonly jobPostingId: string
  readonly candidateId: string
  readonly stageId: string
  readonly status: ApplicationStatus
  readonly employeeId: string | null
  readonly candidate: Candidate
  readonly stage: JobPipelineStage
  readonly notes: readonly ApplicationNote[]
  readonly attachments: readonly ApplicationAttachment[]
}

export type HireResult = ApplicationDetail & {
  readonly temporaryPassword: string
}

export type JobListFilters = {
  readonly status?: JobPostingStatus
  readonly page?: number
  readonly pageSize?: number
}
