import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import type { LoginInput } from '@/features/auth/schema'
import type { LoginResponse } from '@/features/auth/types'

export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(endpoints.auth.login, input)
  return data
}
