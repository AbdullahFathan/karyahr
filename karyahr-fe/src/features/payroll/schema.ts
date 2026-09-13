import { z } from 'zod'
import {
  PAYROLL_PERIOD_TYPES,
  PTKP_STATUSES,
  SALARY_COMPONENT_KINDS,
  TAX_METHODS,
} from '@/features/payroll/types'

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const rupiahString = z.string().regex(/^\d+$/)

export const salaryComponentFormSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(SALARY_COMPONENT_KINDS),
  isTaxable: z.boolean(),
  isActive: z.boolean(),
})

export const payrollProfileFormSchema = z.object({
  employeeId: z.string().min(1),
  ptkpStatus: z.enum(PTKP_STATUSES),
  taxMethod: z.enum(TAX_METHODS),
  npwp: z.string().optional(),
  bankName: z.string().min(1),
  bankAccountNumber: z.string().min(1),
  bankAccountName: z.string().min(1),
  bpjsKesehatanEnrolled: z.boolean(),
  bpjsTkEnrolled: z.boolean(),
})

export const salaryAssignmentFormSchema = z.object({
  employeeId: z.string().min(1),
  componentId: z.string().min(1),
  amountRupiah: rupiahString,
  effectiveFrom: dateKey,
  effectiveTo: z.union([dateKey, z.literal('')]).optional(),
})

export const createPayrollRunFormSchema = z
  .object({
    periodType: z.enum(PAYROLL_PERIOD_TYPES),
    periodStart: dateKey,
    periodEnd: dateKey,
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    message: 'Period end must be on or after period start.',
    path: ['periodEnd'],
  })

export type SalaryComponentFormInput = z.infer<typeof salaryComponentFormSchema>
export type PayrollProfileFormInput = z.infer<typeof payrollProfileFormSchema>
export type SalaryAssignmentFormInput = z.infer<typeof salaryAssignmentFormSchema>
export type CreatePayrollRunFormInput = z.infer<typeof createPayrollRunFormSchema>
