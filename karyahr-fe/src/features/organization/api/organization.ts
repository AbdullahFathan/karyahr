import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import type { Department, OrgTreeNode, Position } from '@/features/organization/types'

type ListEnvelope<T> = { readonly data: readonly T[] }

export async function listDepartments(): Promise<readonly Department[]> {
  const { data } = await apiClient.get<ListEnvelope<Department>>(endpoints.departments)
  return data.data
}

export async function createDepartment(input: {
  readonly name: string
  readonly code: string
  readonly parentId?: string | null
}): Promise<Department> {
  const { data } = await apiClient.post<Department>(endpoints.departments, input)
  return data
}

export async function updateDepartment(
  id: string,
  input: {
    readonly name?: string
    readonly code?: string
    readonly parentId?: string | null
    readonly isActive?: boolean
  },
): Promise<Department> {
  const { data } = await apiClient.patch<Department>(endpoints.department(id), input)
  return data
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(endpoints.department(id))
}

export async function listPositions(): Promise<readonly Position[]> {
  const { data } = await apiClient.get<ListEnvelope<Position>>(endpoints.positions)
  return data.data
}

export async function createPosition(input: {
  readonly name: string
  readonly code: string
  readonly parentId?: string | null
  readonly departmentId?: string | null
}): Promise<Position> {
  const { data } = await apiClient.post<Position>(endpoints.positions, input)
  return data
}

export async function updatePosition(
  id: string,
  input: {
    readonly name?: string
    readonly code?: string
    readonly parentId?: string | null
    readonly departmentId?: string | null
    readonly isActive?: boolean
  },
): Promise<Position> {
  const { data } = await apiClient.patch<Position>(endpoints.position(id), input)
  return data
}

export async function deletePosition(id: string): Promise<void> {
  await apiClient.delete(endpoints.position(id))
}

export async function getOrgTree(departmentId?: string): Promise<readonly OrgTreeNode[]> {
  const { data } = await apiClient.get<ListEnvelope<OrgTreeNode>>(endpoints.orgTree, {
    params: departmentId ? { departmentId } : undefined,
  })
  return data.data
}
