export const SALARY_COMPONENT_KINDS = [
  'BASIC',
  'ALLOWANCE_FIXED',
  'ALLOWANCE_VARIABLE',
  'DEDUCTION',
] as const
export type SalaryComponentKind = (typeof SALARY_COMPONENT_KINDS)[number]

export const PTKP_STATUSES = ['TK_0', 'TK_1', 'TK_2', 'TK_3', 'K_0', 'K_1', 'K_2', 'K_3'] as const
export type PtkpStatus = (typeof PTKP_STATUSES)[number]

export const TAX_METHODS = ['GROSS', 'GROSS_UP', 'NETT'] as const
export type TaxMethod = (typeof TAX_METHODS)[number]

export const PAYROLL_PERIOD_TYPES = ['MONTHLY', 'SEMI_MONTHLY', 'WEEKLY'] as const
export type PayrollPeriodType = (typeof PAYROLL_PERIOD_TYPES)[number]

export const PAYROLL_RUN_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number]

export const PAYSLIP_LINE_KINDS = [
  'EARNING',
  'OVERTIME',
  'GROSS_UP_ALLOWANCE',
  'DEDUCTION',
  'BPJS_EMPLOYEE',
  'PPH21',
  'PPH21_EMPLOYER',
  'BPJS_EMPLOYER',
] as const
export type PayslipLineKind = (typeof PAYSLIP_LINE_KINDS)[number]

export type SalaryComponent = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly kind: SalaryComponentKind
  readonly isTaxable: boolean
  readonly isActive: boolean
}

export type EmployeePayrollProfile = {
  readonly id: string
  readonly employeeId: string
  readonly ptkpStatus: PtkpStatus
  readonly taxMethod: TaxMethod
  readonly npwp: string | null
  readonly bankName: string
  readonly bankAccountNumber: string
  readonly bankAccountName: string
  readonly bpjsKesehatanEnrolled: boolean
  readonly bpjsTkEnrolled: boolean
}

export type EmployeeSalaryAssignment = {
  readonly id: string
  readonly employeeId: string
  readonly componentId: string
  readonly amountRupiah: string
  readonly effectiveFrom: string
  readonly effectiveTo: string | null
}

export type PayrollRunSkip = {
  readonly employeeId: string
  readonly reason: string
}

export type PayrollRun = {
  readonly id: string
  readonly periodType: PayrollPeriodType
  readonly periodStart: string
  readonly periodEnd: string
  readonly status: PayrollRunStatus
  readonly triggeredByUserId: string
  readonly errorMessage: string | null
  readonly processedCount: number
  readonly skippedCount: number
  readonly skipReasons: readonly PayrollRunSkip[]
}

export type PayslipLine = {
  readonly code: string
  readonly name: string
  readonly kind: PayslipLineKind
  readonly amountRupiah: string
}

export type Payslip = {
  readonly id: string
  readonly payrollRunId: string
  readonly employeeId: string
  readonly grossRupiah: string
  readonly statutoryRupiah: string
  readonly netRupiah: string
  readonly lines: readonly PayslipLine[]
  readonly pdfObjectKey: string | null
}
