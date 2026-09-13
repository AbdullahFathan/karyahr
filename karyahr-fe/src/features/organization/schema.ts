import { z } from 'zod'

export const departmentFormSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  parentId: z.string().nullable(),
})

export const positionFormSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  parentId: z.string().nullable(),
  departmentId: z.string().nullable(),
})

export type DepartmentFormInput = z.infer<typeof departmentFormSchema>
export type PositionFormInput = z.infer<typeof positionFormSchema>
