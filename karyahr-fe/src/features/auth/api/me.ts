import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import type { MeResponse } from '@/types/user'

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>(endpoints.auth.me)
  return data
}
