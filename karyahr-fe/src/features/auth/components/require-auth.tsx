import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '@/components/common/loader'
import { useAuth } from '@/features/auth/hooks/use-auth'

export function RequireAuth() {
  const { data, isPending, isError } = useAuth()

  if (isPending) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <Loader />
      </div>
    )
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
