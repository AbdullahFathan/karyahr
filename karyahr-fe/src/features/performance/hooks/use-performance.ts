import { useMutation, useQuery } from '@tanstack/react-query'
import {
  approveGoal,
  assignReviewPeers,
  cancelGoal,
  completeGoal,
  completeReview,
  createCycle,
  createGoal,
  getCycle,
  getDepartmentHeatmap,
  getGoal,
  getReview,
  getTeamDistribution,
  listCycles,
  listEmployeeReviews,
  listGoals,
  listMyGoals,
  listMyReviews,
  lockCycle,
  openCycle,
  rejectGoal,
  submitGoal,
  submitReviewRating,
  updateCycle,
  updateGoal,
  updateGoalProgress,
} from '@/features/performance/api/performance'
import type {
  CreateCycleFormInput,
  KeyResultFormInput,
  SubmitRatingFormInput,
} from '@/features/performance/schema'
import type { GoalListFilters } from '@/features/performance/types'
import type { PaginationQuery } from '@/types/api'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

function invalidatePerformance() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.performance.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.me }),
  ])
}

export function useGoals(filters: GoalListFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.performance.goals(filters),
    queryFn: () => listGoals(filters),
    enabled,
  })
}

export function useMyGoals(query: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.performance.goalsMe(query),
    queryFn: () => listMyGoals(query),
  })
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: queryKeys.performance.goal(id),
    queryFn: () => getGoal(id),
    enabled: Boolean(id),
  })
}

export function useCreateGoal() {
  return useMutation({
    mutationFn: createGoal,
    onSuccess: invalidatePerformance,
  })
}

export function useUpdateGoal(id: string) {
  return useMutation({
    mutationFn: (input: Parameters<typeof updateGoal>[1]) => updateGoal(id, input),
    onSuccess: invalidatePerformance,
  })
}

export function useUpdateGoalProgress(id: string) {
  return useMutation({
    mutationFn: (keyResults: readonly KeyResultFormInput[]) => updateGoalProgress(id, keyResults),
    onSuccess: invalidatePerformance,
  })
}

export function useGoalAction(id: string) {
  return useMutation({
    mutationFn: (action: 'submit' | 'approve' | 'reject' | 'complete' | 'cancel') => {
      if (action === 'submit') {
        return submitGoal(id)
      }
      if (action === 'approve') {
        return approveGoal(id)
      }
      if (action === 'reject') {
        return rejectGoal(id)
      }
      if (action === 'complete') {
        return completeGoal(id)
      }
      return cancelGoal(id)
    },
    onSuccess: invalidatePerformance,
  })
}

export function useCycles() {
  return useQuery({
    queryKey: queryKeys.performance.cycles,
    queryFn: listCycles,
  })
}

export function useCycle(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.performance.cycle(id),
    queryFn: () => getCycle(id),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateCycle() {
  return useMutation({
    mutationFn: createCycle,
    onSuccess: invalidatePerformance,
  })
}

export function useUpdateCycle() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateCycleFormInput }) => updateCycle(id, input),
    onSuccess: invalidatePerformance,
  })
}

export function useOpenCycle() {
  return useMutation({
    mutationFn: openCycle,
    onSuccess: invalidatePerformance,
  })
}

export function useLockCycle() {
  return useMutation({
    mutationFn: lockCycle,
    onSuccess: invalidatePerformance,
  })
}

export function useMyReviews() {
  return useQuery({
    queryKey: queryKeys.performance.reviewsMe,
    queryFn: listMyReviews,
  })
}

export function useReview(id: string) {
  return useQuery({
    queryKey: queryKeys.performance.review(id),
    queryFn: () => getReview(id),
    enabled: Boolean(id),
  })
}

export function useEmployeeReviews(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.performance.employeeReviews(employeeId),
    queryFn: () => listEmployeeReviews(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useAssignReviewPeers(id: string) {
  return useMutation({
    mutationFn: (peerEmployeeIds: readonly string[]) => assignReviewPeers(id, peerEmployeeIds),
    onSuccess: invalidatePerformance,
  })
}

export function useSubmitReviewRating(id: string) {
  return useMutation({
    mutationFn: (input: SubmitRatingFormInput) => submitReviewRating(id, input),
    onSuccess: invalidatePerformance,
  })
}

export function useCompleteReview(id: string) {
  return useMutation({
    mutationFn: () => completeReview(id),
    onSuccess: invalidatePerformance,
  })
}

export function useTeamDistribution(cycleId: string, managerId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.performance.team(cycleId, managerId),
    queryFn: () => getTeamDistribution(cycleId, managerId),
    enabled: enabled && Boolean(cycleId),
  })
}

export function useDepartmentHeatmap(cycleId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.performance.heatmap(cycleId),
    queryFn: () => getDepartmentHeatmap(cycleId),
    enabled: enabled && Boolean(cycleId),
  })
}
