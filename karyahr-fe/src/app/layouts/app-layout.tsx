import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/common/navbar'
import { Sidebar } from '@/components/common/sidebar'
import { APP_NAME, PAGE_TITLES } from '@/lib/constants'

function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname]
  }
  if (pathname.startsWith('/employees/') && pathname !== '/employees/new') {
    return 'Employee'
  }
  if (pathname.includes('/assignments')) {
    return 'Shift assignments'
  }
  if (pathname.startsWith('/payroll/runs/')) {
    return 'Payroll run'
  }
  if (pathname.startsWith('/payslips/')) {
    return 'Payslip'
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/recruitment/jobs/')) {
    return 'Edit job'
  }
  if (pathname.startsWith('/recruitment/jobs/') && pathname !== '/recruitment/jobs/new') {
    return 'Job'
  }
  if (pathname.startsWith('/recruitment/applications/')) {
    return 'Application'
  }
  if (pathname.startsWith('/onboarding/') && pathname !== '/onboarding/templates' && pathname !== '/onboarding/me') {
    return 'Onboarding process'
  }
  if (pathname.startsWith('/performance/goals/') && pathname !== '/performance/goals') {
    return 'Goal'
  }
  if (pathname.startsWith('/performance/reviews/')) {
    return 'Performance review'
  }
  return APP_NAME
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = pageTitle(pathname)

  return (
    <div className="flex h-svh w-full min-w-0 overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar title={title} />
        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
