import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/common/navbar'
import { Sidebar } from '@/components/common/sidebar'
import { APP_NAME, PAGE_TITLES } from '@/lib/constants'

export function AppLayout() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? APP_NAME

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
