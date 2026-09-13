export const EMPLOYEE_STATUSES = ['ACTIVE', 'PROBATION', 'INACTIVE'] as const
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export const CONTRACT_TYPES = ['PERMANENT', 'CONTRACT', 'INTERNSHIP'] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export const DOCUMENT_TYPES = ['KTP', 'NPWP', 'DIPLOMA', 'CONTRACT', 'OTHER'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const CHANGE_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number]

export type Employee = {
  readonly id: string
  readonly fullName: string
  readonly nationalId: string
  readonly birthDate: string
  readonly address: string
  readonly phone: string
  readonly emergencyContact: string
  readonly employeeNumber: string
  readonly departmentId: string
  readonly positionId: string
  readonly managerId: string | null
  readonly joinedAt: string
  readonly status: EmployeeStatus
  readonly contractType: ContractType
}

export type EmployeeMutation = {
  readonly id: string
  readonly employeeId: string
  readonly fromDepartmentId: string
  readonly toDepartmentId: string
  readonly fromPositionId: string
  readonly toPositionId: string
  readonly effectiveAt: string
  readonly reason: string
  readonly createdByUserId: string
}

export type EmployeeDocument = {
  readonly id: string
  readonly employeeId: string
  readonly type: DocumentType
  readonly fileName: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly objectKey: string
  readonly uploadedByUserId: string
}

export type EssPayload = {
  readonly address?: string
  readonly phone?: string
  readonly emergencyContact?: string
}

export type ChangeRequest = {
  readonly id: string
  readonly employeeId: string
  readonly payload: EssPayload
  readonly status: ChangeRequestStatus
  readonly reviewerUserId: string | null
  readonly reviewNote: string | null
}

export type ChangeRequestInboxItem = ChangeRequest & {
  readonly employee: {
    readonly id: string
    readonly fullName: string
    readonly employeeNumber: string
  }
}

export type EmployeeListFilters = {
  readonly search?: string
  readonly departmentId?: string
  readonly status?: EmployeeStatus
  readonly page?: number
  readonly pageSize?: number
}
