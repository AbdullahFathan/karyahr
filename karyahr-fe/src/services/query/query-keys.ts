import type { PaginationQuery } from '@/types/api'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  notifications: {
    me: ['notifications', 'me'] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    me: (from: string, to: string) => ['attendance', 'me', from, to] as const,
    dashboard: (filters: PaginationQuery & { departmentId?: string }) =>
      ['attendance', 'dashboard', filters] as const,
    summary: (filters: {
      period: string
      employeeId?: string
      from?: string
      to?: string
    }) => ['attendance', 'summary', filters] as const,
    shifts: ['attendance', 'shifts'] as const,
    shift: (id: string) => ['attendance', 'shifts', id] as const,
    assignments: (employeeId: string) => ['attendance', 'assignments', employeeId] as const,
  },
  leave: {
    all: ['leave'] as const,
    types: ['leave', 'types'] as const,
    policies: ['leave', 'policies'] as const,
    balancesMe: ['leave', 'balances', 'me'] as const,
    requestsMe: (filters: PaginationQuery) => ['leave', 'requests', 'me', filters] as const,
    inbox: (filters: PaginationQuery) => ['leave', 'inbox', filters] as const,
  },
  organization: {
    departments: ['org', 'departments'] as const,
    positions: ['org', 'positions'] as const,
    tree: (departmentId?: string) => ['org', 'tree', departmentId ?? 'all'] as const,
  },
  employees: {
    all: ['employees'] as const,
    list: (filters: PaginationQuery & { search?: string; departmentId?: string; status?: string }) =>
      ['employees', 'list', filters] as const,
    me: ['employees', 'me'] as const,
    detail: (id: string) => ['employees', id] as const,
    documents: (id: string) => ['employees', id, 'documents'] as const,
    mutations: (id: string) => ['employees', id, 'mutations'] as const,
    myChangeRequests: ['employees', 'me', 'change-requests'] as const,
    changeRequests: (status?: string) => ['employees', 'change-requests', status ?? 'PENDING'] as const,
  },
  roles: {
    all: ['roles'] as const,
    permissions: ['permissions'] as const,
  },
  payroll: {
    all: ['payroll'] as const,
    components: ['payroll', 'components'] as const,
    profile: (employeeId: string) => ['payroll', 'profile', employeeId] as const,
    assignments: (employeeId: string) => ['payroll', 'assignments', employeeId] as const,
    runs: (filters: PaginationQuery) => ['payroll', 'runs', filters] as const,
    run: (id: string) => ['payroll', 'run', id] as const,
    runPayslips: (id: string, filters: PaginationQuery) =>
      ['payroll', 'run', id, 'payslips', filters] as const,
  },
  payslips: {
    me: (filters: PaginationQuery & { from?: string; to?: string }) => ['payslips', 'me', filters] as const,
    detail: (id: string) => ['payslips', id] as const,
  },
  recruitment: {
    all: ['recruitment'] as const,
    jobs: (filters: PaginationQuery & { status?: string }) => ['recruitment', 'jobs', filters] as const,
    job: (id: string) => ['recruitment', 'job', id] as const,
    applications: (jobId: string, filters: PaginationQuery) =>
      ['recruitment', 'job', jobId, 'applications', filters] as const,
    application: (id: string) => ['recruitment', 'application', id] as const,
  },
  careers: {
    all: ['careers'] as const,
    list: ['careers', 'list'] as const,
    detail: (slug: string) => ['careers', slug] as const,
  },
  onboarding: {
    all: ['onboarding'] as const,
    templates: ['onboarding', 'templates'] as const,
    dashboard: (filters: PaginationQuery) => ['onboarding', 'dashboard', filters] as const,
    me: ['onboarding', 'me'] as const,
    process: (employeeId: string) => ['onboarding', 'process', employeeId] as const,
  },
  performance: {
    all: ['performance'] as const,
    goals: (filters: PaginationQuery & {
      employeeId?: string
      departmentId?: string
      level?: string
      status?: string
      parentGoalId?: string
    }) => ['performance', 'goals', filters] as const,
    goalsMe: (filters: PaginationQuery) => ['performance', 'goals', 'me', filters] as const,
    goal: (id: string) => ['performance', 'goal', id] as const,
    cycles: ['performance', 'cycles'] as const,
    cycle: (id: string) => ['performance', 'cycle', id] as const,
    reviewsMe: ['performance', 'reviews', 'me'] as const,
    review: (id: string) => ['performance', 'review', id] as const,
    employeeReviews: (employeeId: string) => ['performance', 'reviews', 'employee', employeeId] as const,
    team: (cycleId: string, managerId?: string) =>
      ['performance', 'team', cycleId, managerId ?? 'self'] as const,
    heatmap: (cycleId: string) => ['performance', 'heatmap', cycleId] as const,
  },
} as const
