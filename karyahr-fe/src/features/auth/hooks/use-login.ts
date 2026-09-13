import { useMutation } from '@tanstack/react-query'
import { login } from '@/features/auth/api/login'
import type { LoginInput } from '@/features/auth/schema'
import { queryKeys } from '@/services/query/query-keys'
import { queryClient } from '@/services/query/query-client'

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    meta: { skipErrorToast: true },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}
