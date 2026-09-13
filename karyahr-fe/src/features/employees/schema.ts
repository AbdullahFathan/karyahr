import { z } from 'zod'
import { CONTRACT_TYPES, DOCUMENT_TYPES, EMPLOYEE_STATUSES } from '@/features/employees/types'

export const employeeFormSchema = z.object({
  fullName: z.string().min(1),
  nationalId: z.string().min(1),
  birthDate: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  emergencyContact: z.string().min(1),
  employeeNumber: z.string().min(1),
  departmentId: z.string().min(1),
  positionId: z.string().min(1),
  managerId: z.string().nullable(),
  joinedAt: z.string().min(1),
  status: z.enum(EMPLOYEE_STATUSES),
  contractType: z.enum(CONTRACT_TYPES),
})

export const mutationFormSchema = z.object({
  toDepartmentId: z.string().min(1),
  toPositionId: z.string().min(1),
  effectiveAt: z.string().min(1),
  reason: z.string().min(1),
})

export const essChangeRequestSchema = z
  .object({
    address: z.string().optional(),
    phone: z.string().optional(),
    emergencyContact: z.string().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.address?.trim()) || Boolean(value.phone?.trim()) || Boolean(value.emergencyContact?.trim()),
    { message: 'At least one field is required' },
  )

export const documentTypeSchema = z.enum(DOCUMENT_TYPES)

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>
export type MutationFormInput = z.infer<typeof mutationFormSchema>
export type EssChangeRequestInput = z.infer<typeof essChangeRequestSchema>
