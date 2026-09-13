import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { toPaginationQuery } from '@/lib/pagination'
import type { ApiEnvelope } from '@/types/api'
import type {
  AttendanceDashboard,
  AttendanceDashboardFilters,
  AttendanceRange,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceSummaryFilters,
  Shift,
  ShiftAssignment,
} from '@/features/attendance/types'
import type { AssignShiftInput, ShiftFormInput } from '@/features/attendance/schema'

export async function checkIn(): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<ApiEnvelope<AttendanceRecord>>(endpoints.attendance.checkIn)
  return data.data
}

export async function checkOut(): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<ApiEnvelope<AttendanceRecord>>(endpoints.attendance.checkOut)
  return data.data
}

export async function listMyAttendance(range: AttendanceRange): Promise<readonly AttendanceRecord[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly AttendanceRecord[]>>(endpoints.attendance.me, {
    params: range,
  })
  return data.data
}

export async function getAttendanceDashboard(
  filters: AttendanceDashboardFilters = {},
): Promise<AttendanceDashboard> {
  const pagination = toPaginationQuery(filters)
  const { data } = await apiClient.get<ApiEnvelope<AttendanceDashboard>>(endpoints.attendance.dashboard, {
    params: {
      ...pagination,
      departmentId: filters.departmentId || undefined,
    },
  })
  return data.data
}

export async function getAttendanceSummary(filters: AttendanceSummaryFilters): Promise<AttendanceSummary> {
  const { data } = await apiClient.get<ApiEnvelope<AttendanceSummary>>(endpoints.attendance.summary, {
    params: {
      period: filters.period,
      employeeId: filters.employeeId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
  })
  return data.data
}

export async function exportAttendanceCsv(range: AttendanceRange): Promise<void> {
  const { data } = await apiClient.get<Blob>(endpoints.attendance.export, {
    params: range,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `attendance-${range.from}-to-${range.to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export async function listShifts(): Promise<readonly Shift[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly Shift[]>>(endpoints.attendance.shifts)
  return data.data
}

export async function getShift(id: string): Promise<Shift> {
  const { data } = await apiClient.get<ApiEnvelope<Shift>>(endpoints.attendance.shift(id))
  return data.data
}

export async function createShift(input: ShiftFormInput): Promise<Shift> {
  const { data } = await apiClient.post<ApiEnvelope<Shift>>(endpoints.attendance.shifts, input)
  return data.data
}

export async function updateShift(id: string, input: Partial<ShiftFormInput>): Promise<Shift> {
  const { data } = await apiClient.patch<ApiEnvelope<Shift>>(endpoints.attendance.shift(id), input)
  return data.data
}

export async function assignShift(shiftId: string, input: AssignShiftInput): Promise<ShiftAssignment> {
  const { data } = await apiClient.post<ApiEnvelope<ShiftAssignment>>(
    endpoints.attendance.shiftAssignments(shiftId),
    input,
  )
  return data.data
}

export async function listShiftAssignments(employeeId: string): Promise<readonly ShiftAssignment[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly ShiftAssignment[]>>(
    endpoints.attendance.employeeAssignments(employeeId),
  )
  return data.data
}
