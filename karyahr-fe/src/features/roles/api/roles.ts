import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import type { Permission, Role } from '@/features/roles/types'
import type { PermissionFormInput, RoleFormInput } from '@/features/roles/schema'

type ListEnvelope<T> = { readonly data: readonly T[] }

export async function listRoles(): Promise<readonly Role[]> {
  const { data } = await apiClient.get<ListEnvelope<Role>>(endpoints.roles)
  return data.data
}

export async function createRole(input: RoleFormInput): Promise<Role> {
  const { data } = await apiClient.post<Role>(endpoints.roles, input)
  return data
}

export async function updateRole(id: string, input: RoleFormInput): Promise<Role> {
  const { data } = await apiClient.patch<Role>(endpoints.role(id), {
    name: input.name,
    description: input.description ?? null,
  })
  return data
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(endpoints.role(id))
}

export async function setRolePermissions(id: string, permissionIds: readonly string[]): Promise<Role> {
  const { data } = await apiClient.put<Role>(endpoints.rolePermissions(id), { permissionIds })
  return data
}

export async function listPermissions(): Promise<readonly Permission[]> {
  const { data } = await apiClient.get<ListEnvelope<Permission>>(endpoints.permissions)
  return data.data
}

export async function createPermission(input: PermissionFormInput): Promise<Permission> {
  const { data } = await apiClient.post<Permission>(endpoints.permissions, input)
  return data
}
