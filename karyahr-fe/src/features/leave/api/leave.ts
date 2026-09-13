import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { toPaginationQuery } from '@/lib/pagination'
import type { ApiEnvelope, Paginated, PaginationQuery } from '@/types/api'
import type {
  LeaveBalance,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestDetail,
  LeaveType,
} from '@/features/leave/types'
import type { LeavePolicyFormInput, LeaveTypeFormInput } from '@/features/leave/schema'

export async function listLeaveTypes(): Promise<readonly LeaveType[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly LeaveType[]>>(endpoints.leave.types)
  return data.data
}

export async function createLeaveType(input: LeaveTypeFormInput): Promise<LeaveType> {
  const { data } = await apiClient.post<ApiEnvelope<LeaveType>>(endpoints.leave.types, input)
  return data.data
}

export async function updateLeaveType(id: string, input: Partial<LeaveTypeFormInput>): Promise<LeaveType> {
  const { data } = await apiClient.patch<ApiEnvelope<LeaveType>>(endpoints.leave.type(id), input)
  return data.data
}

export async function listLeavePolicies(): Promise<readonly LeavePolicy[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly LeavePolicy[]>>(endpoints.leave.policies)
  return data.data
}

export async function createLeavePolicy(input: LeavePolicyFormInput): Promise<LeavePolicy> {
  const { data } = await apiClient.post<ApiEnvelope<LeavePolicy>>(endpoints.leave.policies, input)
  return data.data
}

export async function updateLeavePolicy(
  id: string,
  input: Partial<Omit<LeavePolicyFormInput, 'leaveTypeId'>>,
): Promise<LeavePolicy> {
  const { data } = await apiClient.patch<ApiEnvelope<LeavePolicy>>(endpoints.leave.policy(id), input)
  return data.data
}

export async function listMyLeaveBalances(): Promise<readonly LeaveBalance[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly LeaveBalance[]>>(endpoints.leave.balancesMe)
  return data.data
}

export async function listMyLeaveRequests(query: PaginationQuery = {}): Promise<Paginated<LeaveRequest>> {
  const pagination = toPaginationQuery(query)
  const { data } = await apiClient.get<Paginated<LeaveRequest>>(endpoints.leave.requestsMe, {
    params: pagination,
  })
  return data
}

export async function listLeaveInbox(query: PaginationQuery = {}): Promise<Paginated<LeaveRequest>> {
  const pagination = toPaginationQuery(query)
  const { data } = await apiClient.get<Paginated<LeaveRequest>>(endpoints.leave.requests, {
    params: pagination,
  })
  return data
}

export async function createLeaveRequest(input: {
  readonly leaveTypeId: string
  readonly startDate: string
  readonly endDate: string
  readonly reason: string
  readonly file?: File
}): Promise<LeaveRequestDetail> {
  const form = new FormData()
  form.append('leaveTypeId', input.leaveTypeId)
  form.append('startDate', input.startDate)
  form.append('endDate', input.endDate)
  form.append('reason', input.reason)
  if (input.file) {
    form.append('file', input.file)
  }
  const { data } = await apiClient.post<ApiEnvelope<LeaveRequestDetail>>(endpoints.leave.requests, form)
  return data.data
}

export async function approveLeaveRequest(id: string, comment?: string): Promise<LeaveRequestDetail> {
  const { data } = await apiClient.post<ApiEnvelope<LeaveRequestDetail>>(endpoints.leave.approve(id), {
    comment: comment || null,
  })
  return data.data
}

export async function rejectLeaveRequest(id: string, comment?: string): Promise<LeaveRequestDetail> {
  const { data } = await apiClient.post<ApiEnvelope<LeaveRequestDetail>>(endpoints.leave.reject(id), {
    comment: comment || null,
  })
  return data.data
}
