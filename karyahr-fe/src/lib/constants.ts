export const APP_NAME = 'KaryaHR'

export const BRAND = {
  primary: '#E11D48',
  text: '#16151C',
  page: '#F8F7FA',
  surface: '#FFFFFF',
} as const

export type NavItem = {
  readonly label: string
  readonly to?: string
  readonly permission?: string
}

export type NavGroup = {
  readonly label: string
  readonly items: readonly NavItem[]
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/' },
      { label: 'Profile', to: '/me', permission: 'employees:me:read' },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', to: '/employees', permission: 'employees:read' },
      {
        label: 'Change requests',
        to: '/employees/change-requests',
        permission: 'employees:change-request:review',
      },
      { label: 'Departments', to: '/org/departments', permission: 'org:read' },
      { label: 'Positions', to: '/org/positions', permission: 'org:read' },
      { label: 'Org chart', to: '/org/tree', permission: 'org:read' },
    ],
  },
  {
    label: 'Admin',
    items: [{ label: 'Roles', to: '/admin/roles', permission: 'auth:roles:read' }],
  },
] as const

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/me': 'My profile',
  '/employees': 'Employees',
  '/employees/new': 'Create employee',
  '/employees/change-requests': 'Change requests',
  '/org/departments': 'Departments',
  '/org/positions': 'Positions',
  '/org/tree': 'Org chart',
  '/admin/roles': 'Roles',
}
