import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/common/navbar'
import { Sidebar } from '@/components/common/sidebar'

export function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="KaryaHR" />
        <main style={{ padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
