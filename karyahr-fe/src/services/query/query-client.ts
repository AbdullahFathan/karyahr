import { MutationCache, QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const skipToast = Boolean(
          (mutation.meta as { skipErrorToast?: boolean } | undefined)?.skipErrorToast,
        )
        if (skipToast) {
          return
        }
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          return
        }
        toast.error(getApiErrorMessage(error))
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: true,
        staleTime: 30_000,
      },
    },
  })
}
