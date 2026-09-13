import { NavLink } from 'react-router-dom'
import { APP_NAME } from '@/lib/constants'

export function Sidebar() {
  return (
    <aside
      style={{
        width: 240,
        background: '#ffffff',
        borderRight: '1px solid #eceaf0',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <strong style={{ color: '#e11d48' }}>{APP_NAME}</strong>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/me">Profile</NavLink>
      </nav>
    </aside>
  )
}
