import { useAuth } from '@/features/auth/hooks/use-auth'
import { hasPermission } from '@/lib/auth'

export function useHasPermission(key: string): boolean {
  const { data } = useAuth()
  return data ? hasPermission(data.permissions, key) : false
}
