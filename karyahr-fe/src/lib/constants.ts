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
  readonly end?: boolean
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
    label: 'Time',
    items: [
      { label: 'Check-in', to: '/attendance', permission: 'attendance:me:punch', end: true },
      { label: 'My attendance', to: '/attendance/me', permission: 'attendance:me:read' },
      { label: 'Attendance dashboard', to: '/attendance/dashboard', permission: 'attendance:dashboard' },
      { label: 'Attendance summary', to: '/attendance/summary', permission: 'attendance:me:read' },
      { label: 'Shifts', to: '/attendance/shifts', permission: 'attendance:read', end: true },
      { label: 'Leave types', to: '/leave/types', permission: 'leave:types:write' },
      { label: 'Leave policies', to: '/leave/policies', permission: 'leave:policies:write' },
      { label: 'My leave', to: '/leave', permission: 'leave:requests:me', end: true },
      { label: 'New leave request', to: '/leave/new', permission: 'leave:requests:create' },
      { label: 'Leave inbox', to: '/leave/inbox', permission: 'leave:requests:approve' },
    ],
  },
  {
    label: 'Pay',
    items: [
      { label: 'Salary components', to: '/payroll/components', permission: 'payroll:components:write' },
      { label: 'Payroll runs', to: '/payroll/runs', permission: 'payroll:runs:read', end: true },
      { label: 'My payslips', to: '/payslips', permission: 'payslips:me' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Notifications', to: '/notifications', permission: 'notifications:me' },
      { label: 'Roles', to: '/admin/roles', permission: 'auth:roles:read' },
    ],
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
  '/attendance': 'Check-in / Check-out',
  '/attendance/me': 'My attendance',
  '/attendance/dashboard': 'Attendance dashboard',
  '/attendance/summary': 'Attendance summary',
  '/attendance/shifts': 'Shifts',
  '/leave/types': 'Leave types',
  '/leave/policies': 'Leave policies',
  '/leave': 'My leave',
  '/leave/new': 'New leave request',
  '/leave/inbox': 'Leave inbox',
  '/payroll/components': 'Salary components',
  '/payroll/runs': 'Payroll runs',
  '/payslips': 'My payslips',
  '/notifications': 'Notifications',
  '/admin/roles': 'Roles',
}
