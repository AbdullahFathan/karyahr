export type ApiErrorBody = {
  readonly error?: string
  readonly message?: string
  readonly requestId?: string
}

export type Paginated<T> = {
  readonly items: readonly T[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
}
