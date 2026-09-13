export const PERMISSIONS = {
  AUTH_ME: 'auth:me',
  AUTH_ROLES_READ: 'auth:roles:read',
  AUTH_ROLES_WRITE: 'auth:roles:write',
  AUTH_PERMISSIONS_READ: 'auth:permissions:read',
  AUTH_PERMISSIONS_WRITE: 'auth:permissions:write',
  ORG_READ: 'org:read',
  ORG_WRITE: 'org:write',
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_WRITE: 'employees:write',
  EMPLOYEES_ME_READ: 'employees:me:read',
  EMPLOYEES_DOCUMENTS_READ: 'employees:documents:read',
  EMPLOYEES_DOCUMENTS_WRITE: 'employees:documents:write',
  EMPLOYEES_CHANGE_REQUEST_CREATE: 'employees:change-request:create',
  EMPLOYEES_CHANGE_REQUEST_READ: 'employees:change-request:read',
  EMPLOYEES_CHANGE_REQUEST_REVIEW: 'employees:change-request:review',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
