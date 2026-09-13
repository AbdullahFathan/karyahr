import axios from 'axios'
import { env } from '@/lib/env'
import { attachInterceptors } from '@/services/api/interceptors'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

attachInterceptors(apiClient)
