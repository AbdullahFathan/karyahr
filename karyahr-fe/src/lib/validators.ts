import { z } from 'zod'

export const emailSchema = z.email()
export const passwordSchema = z.string().min(8)
