import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createDepartment,
  createPosition,
  deleteDepartment,
  deletePosition,
  getOrgTree,
  listDepartments,
  listPositions,
  updateDepartment,
  updatePosition,
} from '@/features/organization/api/organization'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.organization.departments,
    queryFn: listDepartments,
  })
}

export function usePositions() {
  return useQuery({
    queryKey: queryKeys.organization.positions,
    queryFn: listPositions,
  })
}

export function useOrgTree(departmentId?: string) {
  return useQuery({
    queryKey: queryKeys.organization.tree(departmentId),
    queryFn: () => getOrgTree(departmentId),
  })
}

function invalidateOrg() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.organization.departments }),
    queryClient.invalidateQueries({ queryKey: queryKeys.organization.positions }),
    queryClient.invalidateQueries({ queryKey: ['org', 'tree'] }),
  ])
}

export function useCreateDepartment() {
  return useMutation({
    mutationFn: createDepartment,
    onSuccess: invalidateOrg,
  })
}

export function useUpdateDepartment() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateDepartment>[1] }) =>
      updateDepartment(id, input),
    onSuccess: invalidateOrg,
  })
}

export function useDeleteDepartment() {
  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: invalidateOrg,
  })
}

export function useCreatePosition() {
  return useMutation({
    mutationFn: createPosition,
    onSuccess: invalidateOrg,
  })
}

export function useUpdatePosition() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updatePosition>[1] }) =>
      updatePosition(id, input),
    onSuccess: invalidateOrg,
  })
}

export function useDeletePosition() {
  return useMutation({
    mutationFn: deletePosition,
    onSuccess: invalidateOrg,
  })
}
