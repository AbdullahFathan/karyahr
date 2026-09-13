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
  readonly enabled: boolean
}

export type NavGroup = {
  readonly label: string
  readonly items: readonly NavItem[]
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', enabled: true },
      { label: 'Profile', to: '/me', enabled: true },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', enabled: false },
      { label: 'Organization', enabled: false },
    ],
  },
  {
    label: 'Time',
    items: [
      { label: 'Attendance', enabled: false },
      { label: 'Leave', enabled: false },
    ],
  },
  {
    label: 'Pay',
    items: [{ label: 'Payroll', enabled: false }],
  },
  {
    label: 'Talent',
    items: [
      { label: 'Recruitment', enabled: false },
      { label: 'Onboarding', enabled: false },
      { label: 'Performance', enabled: false },
    ],
  },
  {
    label: 'Admin',
    items: [{ label: 'Roles', enabled: false }],
  },
] as const

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/me': 'My profile',
}
