import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '@/components/common/loader'
import { useAuth } from '@/features/auth/hooks/use-auth'

export function GuestOnly() {
  const { data, isPending } = useAuth()

  if (isPending) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <Loader />
      </div>
    )
  }

  if (data) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
