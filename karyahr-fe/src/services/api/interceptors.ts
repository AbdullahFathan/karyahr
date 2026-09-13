import axios, { type AxiosInstance } from 'axios'
import { endpoints } from '@/services/api/endpoints'
import { queryClient } from '@/services/query/query-client'

const SKIP_REFRESH_PATHS = new Set<string>([
  endpoints.auth.login,
  endpoints.auth.refresh,
  endpoints.auth.logout,
])

export function attachInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type')
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        return Promise.reject(error)
      }

      const original = error.config
      if (!original) {
        return Promise.reject(error)
      }

      const requestPath = original.url ? pathOf(original.url) : ''
      if (SKIP_REFRESH_PATHS.has(requestPath)) {
        return Promise.reject(error)
      }

      if (original.headers.get?.('X-Retry-After-Refresh') === '1') {
        await expireSessionIfNeeded(client)
        return Promise.reject(error)
      }

      try {
        await client.post(endpoints.auth.refresh)
        original.headers.set('X-Retry-After-Refresh', '1')
        return client.request(original)
      } catch {
        await expireSessionIfNeeded(client)
        return Promise.reject(error)
      }
    },
  )
}

async function expireSessionIfNeeded(client: AxiosInstance): Promise<void> {
  if (window.location.pathname === '/login') {
    return
  }
  try {
    await client.post(endpoints.auth.logout)
  } catch {
    // Cookies may already be invalid.
  }
  queryClient.clear()
  window.location.assign('/login')
}

function pathOf(url: string): string {
  try {
    return new URL(url, 'http://local').pathname
  } catch {
    return url
  }
}
