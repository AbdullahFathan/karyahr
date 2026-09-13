import { useMutation } from '@tanstack/react-query'
import { login } from '@/features/auth/api/login'
import type { LoginInput } from '@/features/auth/schema'

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    meta: { skipErrorToast: true },
  })
}
