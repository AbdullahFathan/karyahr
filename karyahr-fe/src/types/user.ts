export type MeUser = {
  readonly id: string
  readonly email: string
  readonly employeeId: string
  readonly isActive: boolean
}

export type MeEmployee = {
  readonly id: string
  readonly fullName: string
  readonly employeeNumber: string
  readonly status: string
}

export type MeResponse = {
  readonly user: MeUser
  readonly employee: MeEmployee
  readonly roles: readonly string[]
  readonly permissions: readonly string[]
}
