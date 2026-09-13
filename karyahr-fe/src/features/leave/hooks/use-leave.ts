import { useMutation, useQuery } from '@tanstack/react-query'
import {
  approveLeaveRequest,
  createLeavePolicy,
  createLeaveRequest,
  createLeaveType,
  listLeaveInbox,
  listLeavePolicies,
  listLeaveTypes,
  listMyLeaveBalances,
  listMyLeaveRequests,
  rejectLeaveRequest,
  updateLeavePolicy,
  updateLeaveType,
} from '@/features/leave/api/leave'
import type { LeavePolicyFormInput, LeaveTypeFormInput } from '@/features/leave/schema'
import type { PaginationQuery } from '@/types/api'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

function invalidateLeave() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.leave.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.me }),
  ])
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: queryKeys.leave.types,
    queryFn: listLeaveTypes,
  })
}

export function useCreateLeaveType() {
  return useMutation({
    mutationFn: createLeaveType,
    onSuccess: invalidateLeave,
  })
}

export function useUpdateLeaveType() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LeaveTypeFormInput> }) =>
      updateLeaveType(id, input),
    onSuccess: invalidateLeave,
  })
}

export function useLeavePolicies() {
  return useQuery({
    queryKey: queryKeys.leave.policies,
    queryFn: listLeavePolicies,
  })
}

export function useCreateLeavePolicy() {
  return useMutation({
    mutationFn: createLeavePolicy,
    onSuccess: invalidateLeave,
  })
}

export function useUpdateLeavePolicy() {
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<Omit<LeavePolicyFormInput, 'leaveTypeId'>>
    }) => updateLeavePolicy(id, input),
    onSuccess: invalidateLeave,
  })
}

export function useMyLeaveBalances() {
  return useQuery({
    queryKey: queryKeys.leave.balancesMe,
    queryFn: listMyLeaveBalances,
  })
}

export function useMyLeaveRequests(query: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.leave.requestsMe(query),
    queryFn: () => listMyLeaveRequests(query),
  })
}

export function useLeaveInbox(query: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.leave.inbox(query),
    queryFn: () => listLeaveInbox(query),
  })
}

export function useCreateLeaveRequest() {
  return useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: invalidateLeave,
  })
}

export function useReviewLeaveRequest() {
  return useMutation({
    mutationFn: ({
      id,
      action,
      comment,
    }: {
      id: string
      action: 'approve' | 'reject'
      comment?: string
    }) => (action === 'approve' ? approveLeaveRequest(id, comment) : rejectLeaveRequest(id, comment)),
    onSuccess: invalidateLeave,
  })
}
