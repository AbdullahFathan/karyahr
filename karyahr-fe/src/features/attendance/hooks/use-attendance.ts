import { useMutation, useQuery } from '@tanstack/react-query'
import {
  assignShift,
  checkIn,
  checkOut,
  createShift,
  exportAttendanceCsv,
  getAttendanceDashboard,
  getAttendanceSummary,
  getShift,
  listMyAttendance,
  listShiftAssignments,
  listShifts,
  updateShift,
} from '@/features/attendance/api/attendance'
import type {
  AttendanceDashboardFilters,
  AttendanceRange,
  AttendanceSummaryFilters,
} from '@/features/attendance/types'
import type { AssignShiftInput, ShiftFormInput } from '@/features/attendance/schema'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

function invalidateAttendance() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all })
}

export function useMyAttendance(range: AttendanceRange, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attendance.me(range.from, range.to),
    queryFn: () => listMyAttendance(range),
    enabled: enabled && Boolean(range.from && range.to),
  })
}

export function useCheckIn() {
  return useMutation({
    mutationFn: checkIn,
    onSuccess: invalidateAttendance,
  })
}

export function useCheckOut() {
  return useMutation({
    mutationFn: checkOut,
    onSuccess: invalidateAttendance,
  })
}

export function useAttendanceDashboard(filters: AttendanceDashboardFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attendance.dashboard(filters),
    queryFn: () => getAttendanceDashboard(filters),
    enabled,
  })
}

export function useAttendanceSummary(filters: AttendanceSummaryFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attendance.summary(filters),
    queryFn: () => getAttendanceSummary(filters),
    enabled,
  })
}

export function useExportAttendanceCsv() {
  return useMutation({
    mutationFn: exportAttendanceCsv,
  })
}

export function useShifts() {
  return useQuery({
    queryKey: queryKeys.attendance.shifts,
    queryFn: listShifts,
  })
}

export function useShift(id: string) {
  return useQuery({
    queryKey: queryKeys.attendance.shift(id),
    queryFn: () => getShift(id),
    enabled: Boolean(id),
  })
}

export function useCreateShift() {
  return useMutation({
    mutationFn: createShift,
    onSuccess: invalidateAttendance,
  })
}

export function useUpdateShift() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ShiftFormInput> }) => updateShift(id, input),
    onSuccess: invalidateAttendance,
  })
}

export function useShiftAssignments(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.attendance.assignments(employeeId),
    queryFn: () => listShiftAssignments(employeeId),
    enabled: Boolean(employeeId),
  })
}

export function useAssignShift() {
  return useMutation({
    mutationFn: ({ shiftId, input }: { shiftId: string; input: AssignShiftInput }) =>
      assignShift(shiftId, input),
    onSuccess: invalidateAttendance,
  })
}
