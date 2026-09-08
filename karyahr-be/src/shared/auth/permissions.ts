export const PERMISSIONS = {
  AUTH_ME: "auth:me",
  AUTH_ROLES_READ: "auth:roles:read",
  AUTH_ROLES_WRITE: "auth:roles:write",
  AUTH_PERMISSIONS_READ: "auth:permissions:read",
  AUTH_PERMISSIONS_WRITE: "auth:permissions:write",
  ORG_READ: "org:read",
  ORG_WRITE: "org:write",
  EMPLOYEES_READ: "employees:read",
  EMPLOYEES_WRITE: "employees:write",
  EMPLOYEES_ME_READ: "employees:me:read",
  EMPLOYEES_DOCUMENTS_READ: "employees:documents:read",
  EMPLOYEES_DOCUMENTS_WRITE: "employees:documents:write",
  EMPLOYEES_CHANGE_REQUEST_CREATE: "employees:change-request:create",
  EMPLOYEES_CHANGE_REQUEST_READ: "employees:change-request:read",
  EMPLOYEES_CHANGE_REQUEST_REVIEW: "employees:change-request:review",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = Object.values(PERMISSIONS);

export const EMPLOYEE_ROLE_PERMISSIONS: readonly PermissionKey[] = [
  PERMISSIONS.AUTH_ME,
  PERMISSIONS.EMPLOYEES_ME_READ,
  PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_CREATE,
  PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_READ,
];

export const HR_ADMIN_ROLE = "hr_admin";
export const EMPLOYEE_ROLE = "employee";
