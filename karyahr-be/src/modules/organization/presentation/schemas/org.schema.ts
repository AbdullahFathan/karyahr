import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  parentId: z.string().nullable().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createPositionSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  parentId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

export const updatePositionSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;
export type CreatePositionDto = z.infer<typeof createPositionSchema>;
export type UpdatePositionDto = z.infer<typeof updatePositionSchema>;
