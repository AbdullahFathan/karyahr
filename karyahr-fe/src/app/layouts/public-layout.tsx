import { Link, Outlet } from 'react-router-dom'
import { APP_NAME } from '@/lib/constants'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center border-b bg-card px-6">
        <Link to="/careers" className="font-heading text-lg font-semibold text-primary">
          {APP_NAME}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
