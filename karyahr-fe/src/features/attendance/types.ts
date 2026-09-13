import type { PaginationQuery } from '@/types/api'

export const ATTENDANCE_RECORD_STATUSES = ['OPEN', 'CLOSED'] as const
export type AttendanceRecordStatus = (typeof ATTENDANCE_RECORD_STATUSES)[number]

export const ATTENDANCE_SUMMARY_PERIODS = ['day', 'week', 'month'] as const
export type AttendanceSummaryPeriod = (typeof ATTENDANCE_SUMMARY_PERIODS)[number]

export type AttendanceRecord = {
  readonly id: string
  readonly employeeId: string
  readonly shiftId: string
  readonly workDate: string
  readonly checkedInAt: string
  readonly checkedOutAt: string | null
  readonly workedMinutes: number | null
  readonly lateMinutes: number
  readonly earlyLeaveMinutes: number
  readonly overtimeMinutes: number
  readonly status: AttendanceRecordStatus
}

export type Shift = {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly startMinutes: number
  readonly endMinutes: number
  readonly graceMinutesLate: number
  readonly graceMinutesEarly: number
  readonly overtimeCapMinutes: number
  readonly isFlexible: boolean
  readonly isActive: boolean
}

export type ShiftAssignment = {
  readonly id: string
  readonly employeeId: string
  readonly shiftId: string
  readonly effectiveFrom: string
  readonly effectiveTo: string | null
}

export type AttendanceSummary = {
  readonly from: string
  readonly to: string
  readonly presentDays: number
  readonly lateDays: number
  readonly earlyLeaveDays: number
  readonly records: readonly AttendanceRecord[]
}

export type DashboardRow = {
  readonly employeeId: string
  readonly fullName: string
  readonly employeeNumber: string
}

export type AttendanceDashboard = {
  readonly workDate: string
  readonly present: readonly DashboardRow[]
  readonly late: readonly DashboardRow[]
  readonly absent: readonly DashboardRow[]
  readonly onLeave: readonly DashboardRow[]
  readonly meta: {
    readonly total: number
    readonly page: number
    readonly pageSize: number
    readonly totalPages: number
  }
}

export type AttendanceRange = {
  readonly from: string
  readonly to: string
}

export type AttendanceDashboardFilters = PaginationQuery & {
  readonly departmentId?: string
}

export type AttendanceSummaryFilters = {
  readonly period: AttendanceSummaryPeriod
  readonly employeeId?: string
  readonly from?: string
  readonly to?: string
}
