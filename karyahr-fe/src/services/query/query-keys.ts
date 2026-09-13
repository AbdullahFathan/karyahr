export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  notifications: {
    me: ['notifications', 'me'] as const,
  },
  employees: {
    all: ['employees'] as const,
    me: ['employees', 'me'] as const,
    detail: (id: string) => ['employees', id] as const,
  },
} as const
