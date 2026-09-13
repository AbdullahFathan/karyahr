import type { MeUser } from '@/types/user'

export type LoginResponse = {
  readonly user: Pick<MeUser, 'id' | 'email' | 'employeeId'>
}
