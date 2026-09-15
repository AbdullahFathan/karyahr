import axios from 'axios'
import type { ApiErrorBody } from '@/types/api'

const FALLBACK_MESSAGE = 'Something went wrong.'

/**
 * Reads the backend error envelope `{ error, message, requestId }`.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined
    if (typeof body?.message === 'string' && body.message.length > 0) {
      return body.message
    }
    if (typeof body?.error === 'string' && body.error.length > 0) {
      return body.error
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return FALLBACK_MESSAGE
}

/**
 * Returns the HTTP status from an Axios error, or undefined when absent.
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status
  }
  return undefined
}
