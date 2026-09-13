import { Navigate, Outlet } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { hasPermission } from '@/lib/auth'

type RequireAnyPermissionProps = {
  readonly permissions: readonly string[]
}

export function RequireAnyPermission({ permissions }: RequireAnyPermissionProps) {
  const { data, isPending } = useAuth()

  if (isPending) {
    return <Loader />
  }

  if (!data) {
    return <Navigate to="/login" replace />
  }

  const allowed = permissions.some((permission) => hasPermission(data.permissions, permission))
  if (!allowed) {
    return <EmptyState title="Not allowed" description="You do not have permission to view this page." />
  }

  return <Outlet />
}
