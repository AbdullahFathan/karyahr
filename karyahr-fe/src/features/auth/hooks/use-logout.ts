import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/features/auth/api/logout'
import { queryClient } from '@/services/query/query-client'

export function useLogout() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logout,
    meta: { skipErrorToast: true },
    onSettled: async () => {
      queryClient.clear()
      await navigate('/login')
    },
  })
}
