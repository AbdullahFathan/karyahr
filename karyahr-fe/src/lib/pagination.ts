import type { PaginationQuery } from '@/types/api'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/**
 * Normalizes list query params to the backend page/pageSize contract.
 */
export function toPaginationQuery(query: PaginationQuery = {}): {
  page: number
  pageSize: number
} {
  const page = Math.max(DEFAULT_PAGE, Math.trunc(query.page ?? DEFAULT_PAGE))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  )
  return { page, pageSize }
}
