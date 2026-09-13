import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <Outlet />
    </div>
  )
}
