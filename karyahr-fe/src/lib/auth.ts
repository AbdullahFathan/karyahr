import type { MeResponse } from '@/types/user'

export function hasPermission(permissions: readonly string[], key: string): boolean {
  return permissions.includes(key)
}

export function displayName(me: MeResponse): string {
  return me.employee.fullName || me.user.email
}

export function primaryRole(me: MeResponse): string {
  return me.roles[0] ?? 'employee'
}
