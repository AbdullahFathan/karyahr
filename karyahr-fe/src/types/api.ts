export type PaginationQuery = {
  readonly page?: number
  readonly pageSize?: number
}

export type PaginationMeta = {
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly totalPages: number
}

export type Paginated<T> = {
  readonly data: readonly T[]
  readonly meta: PaginationMeta
}

export type ApiEnvelope<T> = {
  readonly data: T
}

export type ApiErrorBody = {
  readonly error?: string
  readonly message?: string
  readonly requestId?: string
}
