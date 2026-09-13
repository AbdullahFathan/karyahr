export const LEAVE_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number]

export const LEAVE_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type LeaveApprovalStatus = (typeof LEAVE_APPROVAL_STATUSES)[number]

export type LeaveType = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly requiresBalance: boolean
  readonly requiresAttachment: boolean
  readonly isActive: boolean
}

export type LeavePolicy = {
  readonly id: string
  readonly leaveTypeId: string
  readonly departmentId: string | null
  readonly positionId: string | null
  readonly annualAllowanceDays: number
  readonly approvalLevelCount: number
  readonly accrualPerMonth: number
}

export type LeaveBalance = {
  readonly id: string
  readonly employeeId: string
  readonly leaveTypeId: string
  readonly year: number
  readonly entitledDays: number
  readonly usedDays: number
  readonly pendingDays: number
  readonly lastAccruedYearMonth: number | null
}

export type LeaveRequest = {
  readonly id: string
  readonly employeeId: string
  readonly leaveTypeId: string
  readonly startDate: string
  readonly endDate: string
  readonly days: number
  readonly reason: string
  readonly status: LeaveRequestStatus
  readonly currentStep: number
}

export type LeaveApproval = {
  readonly id: string
  readonly requestId: string
  readonly step: number
  readonly approverEmployeeId: string | null
  readonly status: LeaveApprovalStatus
  readonly comment: string | null
  readonly decidedAt: string | null
}

export type LeaveAttachment = {
  readonly id: string
  readonly requestId: string
  readonly fileName: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly objectKey: string
  readonly uploadedByUserId: string
}

export type LeaveRequestDetail = {
  readonly request: LeaveRequest
  readonly approvals: readonly LeaveApproval[]
  readonly attachments: readonly LeaveAttachment[]
}
