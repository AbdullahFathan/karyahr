import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().min(1)),
});

export const createPermissionSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
export type SetRolePermissionsDto = z.infer<typeof setRolePermissionsSchema>;
export type CreatePermissionDto = z.infer<typeof createPermissionSchema>;
