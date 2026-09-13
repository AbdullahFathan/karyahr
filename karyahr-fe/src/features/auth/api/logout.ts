import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

export async function logout(): Promise<void> {
  await apiClient.post(endpoints.auth.logout)
}
