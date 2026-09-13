import { z } from 'zod'

export const roleFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export const permissionFormSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
})

export type RoleFormInput = z.infer<typeof roleFormSchema>
export type PermissionFormInput = z.infer<typeof permissionFormSchema>
