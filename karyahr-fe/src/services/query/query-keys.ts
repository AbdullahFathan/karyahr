import type { PaginationQuery } from '@/types/api'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  notifications: {
    me: ['notifications', 'me'] as const,
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
} as const
