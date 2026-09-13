import type { MeUser } from '@/types/user'

export function hasPermission(permissions: readonly string[], key: string): boolean {
  return permissions.includes(key)
}

export function displayName(user: MeUser, fallbackEmail: string): string {
  return user.email || fallbackEmail
}
