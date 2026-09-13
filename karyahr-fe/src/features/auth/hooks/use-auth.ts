import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/features/auth/api/me'
import { queryKeys } from '@/services/query/query-keys'

export function useAuth() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMe,
    retry: false,
  })
}
