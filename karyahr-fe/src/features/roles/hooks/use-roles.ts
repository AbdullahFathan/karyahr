import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createPermission,
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  setRolePermissions,
  updateRole,
} from '@/features/roles/api/roles'
import type { PermissionFormInput, RoleFormInput } from '@/features/roles/schema'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

export function useRoles() {
  return useQuery({ queryKey: queryKeys.roles.all, queryFn: listRoles })
}

export function usePermissionsCatalog() {
  return useQuery({ queryKey: queryKeys.roles.permissions, queryFn: listPermissions })
}

function invalidateRoles() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
}

export function useCreateRole() {
  return useMutation({
    mutationFn: createRole,
    onSuccess: invalidateRoles,
  })
}

export function useUpdateRole() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoleFormInput }) => updateRole(id, input),
    onSuccess: invalidateRoles,
  })
}

export function useDeleteRole() {
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: invalidateRoles,
  })
}

export function useSetRolePermissions() {
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: readonly string[] }) =>
      setRolePermissions(id, permissionIds),
    onSuccess: invalidateRoles,
  })
}

export function useCreatePermission() {
  return useMutation({
    mutationFn: (input: PermissionFormInput) => createPermission(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissions }),
  })
}
