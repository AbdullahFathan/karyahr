import { Navigate, Outlet } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { hasPermission } from '@/lib/auth'

type RequirePermissionProps = {
  readonly permission: string
}

export function RequirePermission({ permission }: RequirePermissionProps) {
  const { data, isPending } = useAuth()

  if (isPending) {
    return <Loader />
  }

  if (!data) {
    return <Navigate to="/login" replace />
  }

  if (!hasPermission(data.permissions, permission)) {
    return <EmptyState title="Forbidden" description="You do not have permission to view this page." />
  }

  return <Outlet />
}
