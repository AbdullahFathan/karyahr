export type Role = {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly permissionKeys: readonly string[]
}

export type Permission = {
  readonly id: string
  readonly key: string
  readonly description: string | null
}
