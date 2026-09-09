import { z } from "zod";
import { PAYROLL_PERIOD_TYPES, PTKP_STATUSES, SALARY_COMPONENT_KINDS, TAX_METHODS } from "../../domain/entities/Payroll";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rupiahString = z.string().regex(/^\d+$/);

export const createSalaryComponentSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(SALARY_COMPONENT_KINDS),
  isTaxable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updateSalaryComponentSchema = createSalaryComponentSchema.partial();

export const upsertPayrollProfileSchema = z.object({
  employeeId: z.string().min(1),
  ptkpStatus: z.enum(PTKP_STATUSES),
  taxMethod: z.enum(TAX_METHODS),
  npwp: z.string().min(1).nullable().optional(),
  bankName: z.string().min(1),
  bankAccountNumber: z.string().min(1),
  bankAccountName: z.string().min(1),
  bpjsKesehatanEnrolled: z.boolean().default(true),
  bpjsTkEnrolled: z.boolean().default(true),
});

export const assignSalarySchema = z.object({
  employeeId: z.string().min(1),
  componentId: z.string().min(1),
  amountRupiah: rupiahString,
  effectiveFrom: dateKey,
  effectiveTo: dateKey.nullable().optional(),
});

export const createPayrollRunSchema = z.object({
  periodType: z.enum(PAYROLL_PERIOD_TYPES),
  periodStart: dateKey,
  periodEnd: dateKey,
});

export const payslipRangeQuerySchema = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const exportYearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type CreateSalaryComponentDto = z.infer<typeof createSalaryComponentSchema>;
export type UpdateSalaryComponentDto = z.infer<typeof updateSalaryComponentSchema>;
export type UpsertPayrollProfileDto = z.infer<typeof upsertPayrollProfileSchema>;
export type AssignSalaryDto = z.infer<typeof assignSalarySchema>;
export type CreatePayrollRunDto = z.infer<typeof createPayrollRunSchema>;
