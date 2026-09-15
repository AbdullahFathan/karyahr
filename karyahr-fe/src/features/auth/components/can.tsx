import type { ReactNode } from 'react'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'

type CanProps = {
  readonly permission: string
  readonly children: ReactNode
}

/**
 * Renders children only when the session includes the permission key.
 */
export function Can({ permission, children }: CanProps) {
  const allowed = useHasPermission(permission)
  if (!allowed) {
    return null
  }
  return children
}
