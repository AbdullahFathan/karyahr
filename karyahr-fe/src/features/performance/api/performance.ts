import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { toPaginationQuery } from '@/lib/pagination'
import type { ApiEnvelope, Paginated, PaginationQuery } from '@/types/api'
import type {
  CreateCycleFormInput,
  CreateGoalFormInput,
  KeyResultFormInput,
  SubmitRatingFormInput,
} from '@/features/performance/schema'
import type {
  DepartmentHeatmap,
  GoalDetail,
  GoalListFilters,
  PerformanceCycle,
  PerformancePeerAssignment,
  PerformanceRating,
  PerformanceReview,
  PerformanceReviewDetail,
  TeamDistribution,
} from '@/features/performance/types'

function optionalId(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  return value && value.length > 0 ? value : null
}

function goalCreatePayload(input: CreateGoalFormInput) {
  return {
    level: input.level,
    parentGoalId: optionalId(input.parentGoalId),
    departmentId: input.level === 'DEPARTMENT' ? optionalId(input.departmentId) : null,
    employeeId: input.level === 'EMPLOYEE' ? optionalId(input.employeeId) : null,
    title: input.title,
    description: input.description,
    keyResults: input.keyResults && input.keyResults.length > 0 ? input.keyResults : undefined,
  }
}

export async function listGoals(filters: GoalListFilters = {}): Promise<Paginated<GoalDetail>> {
  const pagination = toPaginationQuery(filters)
  const { data } = await apiClient.get<Paginated<GoalDetail>>(endpoints.performance.goals, {
    params: {
      ...pagination,
      employeeId: filters.employeeId || undefined,
      departmentId: filters.departmentId || undefined,
      level: filters.level || undefined,
      status: filters.status || undefined,
      parentGoalId: filters.parentGoalId || undefined,
    },
  })
  return data
}

export async function listMyGoals(query: PaginationQuery = {}): Promise<Paginated<GoalDetail>> {
  const pagination = toPaginationQuery(query)
  const { data } = await apiClient.get<Paginated<GoalDetail>>(endpoints.performance.goalsMe, {
    params: pagination,
  })
  return data
}

export async function getGoal(id: string): Promise<GoalDetail> {
  const { data } = await apiClient.get<ApiEnvelope<GoalDetail>>(endpoints.performance.goal(id))
  return data.data
}

export async function createGoal(input: CreateGoalFormInput): Promise<GoalDetail> {
  const { data } = await apiClient.post<ApiEnvelope<GoalDetail>>(
    endpoints.performance.goals,
    goalCreatePayload(input),
  )
  return data.data
}

export async function updateGoal(
  id: string,
  input: {
    readonly title?: string
    readonly description?: string
    readonly parentGoalId?: string | null
    readonly keyResults?: readonly KeyResultFormInput[]
    readonly progressPercent?: number
  },
): Promise<GoalDetail> {
  const { data } = await apiClient.patch<ApiEnvelope<GoalDetail>>(endpoints.performance.goal(id), input)
  return data.data
}

export async function updateGoalProgress(
  id: string,
  keyResults: readonly KeyResultFormInput[],
): Promise<GoalDetail> {
  const { data } = await apiClient.post<ApiEnvelope<GoalDetail>>(endpoints.performance.goalProgress(id), {
    keyResults,
  })
  return data.data
}

export async function submitGoal(id: string): Promise<GoalDetail> {
  const { data } = await apiClient.post<ApiEnvelope<GoalDetail>>(endpoints.performance.goalSubmit(id))
  return data.data
}

export async function approveGoal(id: string): Promise<GoalDetail> {
  const { data } = await apiClient.post<ApiEnvelope<GoalDetail>>(endpoints.performance.goalApprove(id))
  return data.data
}

export async function rejectGoal(id: string): Promise<GoalDetail> {
  const { data } = await apiClient.post<ApiEnvelope<GoalDetail>>(endpoints.performance.goalReject(id))
  return data.data
}

export async function completeGoal(id: string): Promise<GoalDetail> {
  const { data } = await apiClient.post<ApiEnvelope<GoalDetail>>(endpoints.performance.goalComplete(id))
  return data.data
}

export async function cancelGoal(id: string): Promise<GoalDetail> {
  const { data } = await apiClient.post<ApiEnvelope<GoalDetail>>(endpoints.performance.goalCancel(id))
  return data.data
}

export async function listCycles(): Promise<readonly PerformanceCycle[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly PerformanceCycle[]>>(
    endpoints.performance.cycles,
  )
  return data.data
}

export async function getCycle(id: string): Promise<PerformanceCycle> {
  const { data } = await apiClient.get<ApiEnvelope<PerformanceCycle>>(endpoints.performance.cycle(id))
  return data.data
}

export async function createCycle(input: CreateCycleFormInput): Promise<PerformanceCycle> {
  const { data } = await apiClient.post<ApiEnvelope<PerformanceCycle>>(endpoints.performance.cycles, {
    name: input.name,
    periodType: input.periodType,
    startsAt: new Date(`${input.startsAt}T00:00:00.000Z`).toISOString(),
    endsAt: new Date(`${input.endsAt}T23:59:59.000Z`).toISOString(),
  })
  return data.data
}

export async function updateCycle(id: string, input: CreateCycleFormInput): Promise<PerformanceCycle> {
  const { data } = await apiClient.patch<ApiEnvelope<PerformanceCycle>>(endpoints.performance.cycle(id), {
    name: input.name,
    periodType: input.periodType,
    startsAt: new Date(`${input.startsAt}T00:00:00.000Z`).toISOString(),
    endsAt: new Date(`${input.endsAt}T23:59:59.000Z`).toISOString(),
  })
  return data.data
}

export async function openCycle(id: string): Promise<PerformanceCycle> {
  const { data } = await apiClient.post<ApiEnvelope<PerformanceCycle>>(endpoints.performance.cycleOpen(id))
  return data.data
}

export async function lockCycle(id: string): Promise<PerformanceCycle> {
  const { data } = await apiClient.post<ApiEnvelope<PerformanceCycle>>(endpoints.performance.cycleLock(id))
  return data.data
}

export async function listMyReviews(): Promise<readonly PerformanceReview[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly PerformanceReview[]>>(
    endpoints.performance.reviewsMe,
  )
  return data.data
}

export async function getReview(id: string): Promise<PerformanceReviewDetail> {
  const { data } = await apiClient.get<ApiEnvelope<PerformanceReviewDetail>>(
    endpoints.performance.review(id),
  )
  return data.data
}

export async function listEmployeeReviews(employeeId: string): Promise<readonly PerformanceReview[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly PerformanceReview[]>>(
    endpoints.performance.employeeReviews(employeeId),
  )
  return data.data
}

export async function assignReviewPeers(
  id: string,
  peerEmployeeIds: readonly string[],
): Promise<readonly PerformancePeerAssignment[]> {
  const { data } = await apiClient.post<ApiEnvelope<readonly PerformancePeerAssignment[]>>(
    endpoints.performance.reviewPeers(id),
    { peerEmployeeIds },
  )
  return data.data
}

export async function submitReviewRating(
  id: string,
  input: SubmitRatingFormInput,
): Promise<PerformanceRating> {
  const { data } = await apiClient.post<ApiEnvelope<PerformanceRating>>(
    endpoints.performance.reviewRatings(id),
    input,
  )
  return data.data
}

export async function completeReview(id: string): Promise<PerformanceReview> {
  const { data } = await apiClient.post<ApiEnvelope<PerformanceReview>>(
    endpoints.performance.reviewComplete(id),
  )
  return data.data
}

export async function getTeamDistribution(
  cycleId: string,
  managerId?: string,
): Promise<TeamDistribution> {
  const { data } = await apiClient.get<ApiEnvelope<TeamDistribution>>(
    endpoints.performance.teamDashboard,
    { params: { cycleId, managerId: managerId || undefined } },
  )
  return data.data
}

export async function getDepartmentHeatmap(cycleId: string): Promise<DepartmentHeatmap> {
  const { data } = await apiClient.get<ApiEnvelope<DepartmentHeatmap>>(endpoints.performance.heatmap, {
    params: { cycleId },
  })
  return data.data
}
