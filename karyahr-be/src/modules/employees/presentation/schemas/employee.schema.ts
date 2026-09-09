import { z } from "zod";
import {
  CONTRACT_TYPES,
  DOCUMENT_TYPES,
  EMPLOYEE_STATUSES,
} from "../../domain/entities/Employee";

const dateString = z.coerce.date();

export const createEmployeeSchema = z.object({
  fullName: z.string().min(1),
  nationalId: z.string().min(1),
  birthDate: dateString,
  address: z.string().min(1),
  phone: z.string().min(1),
  emergencyContact: z.string().min(1),
  employeeNumber: z.string().min(1),
  departmentId: z.string().min(1),
  positionId: z.string().min(1),
  managerId: z.string().nullable().optional(),
  joinedAt: dateString,
  status: z.enum(EMPLOYEE_STATUSES),
  contractType: z.enum(CONTRACT_TYPES),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const listEmployeesQuerySchema = z.object({
  departmentId: z.string().optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const createMutationSchema = z.object({
  toDepartmentId: z.string().min(1),
  toPositionId: z.string().min(1),
  effectiveAt: dateString,
  reason: z.string().min(1),
});

export const createChangeRequestSchema = z
  .object({
    address: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    emergencyContact: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.address !== undefined ||
      value.phone !== undefined ||
      value.emergencyContact !== undefined,
    { message: "At least one field is required" },
  );

export const reviewChangeRequestSchema = z.object({
  reviewNote: z.string().nullable().optional(),
});

export const offboardEmployeeSchema = z.object({
  reason: z.string().min(1).optional(),
});

export const documentTypeSchema = z.enum(DOCUMENT_TYPES);

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQueryDto = z.infer<typeof listEmployeesQuerySchema>;
export type CreateMutationDto = z.infer<typeof createMutationSchema>;
export type CreateChangeRequestDto = z.infer<typeof createChangeRequestSchema>;
export type OffboardEmployeeDto = z.infer<typeof offboardEmployeeSchema>;
