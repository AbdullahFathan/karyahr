import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import type { Paginated } from '@/types/api'
import type {
  ChangeRequest,
  ChangeRequestInboxItem,
  ChangeRequestStatus,
  DocumentType,
  Employee,
  EmployeeDocument,
  EmployeeListFilters,
  EmployeeMutation,
} from '@/features/employees/types'
import type { EmployeeFormInput, MutationFormInput } from '@/features/employees/schema'
import { toPaginationQuery } from '@/lib/pagination'

type ListEnvelope<T> = { readonly data: readonly T[] }

export async function listEmployees(filters: EmployeeListFilters = {}): Promise<Paginated<Employee>> {
  const pagination = toPaginationQuery(filters)
  const { data } = await apiClient.get<Paginated<Employee>>(endpoints.employees, {
    params: {
      ...pagination,
      search: filters.search || undefined,
      departmentId: filters.departmentId || undefined,
      status: filters.status || undefined,
    },
  })
  return data
}

export async function createEmployee(input: EmployeeFormInput): Promise<Employee> {
  const { data } = await apiClient.post<Employee>(endpoints.employees, {
    ...input,
    managerId: input.managerId || null,
  })
  return data
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await apiClient.get<Employee>(endpoints.employee(id))
  return data
}

export async function getMyEmployee(): Promise<Employee> {
  const { data } = await apiClient.get<Employee>(endpoints.employeesMe)
  return data
}

export async function updateEmployee(id: string, input: Partial<EmployeeFormInput>): Promise<Employee> {
  const { data } = await apiClient.patch<Employee>(endpoints.employee(id), input)
  return data
}

export async function offboardEmployee(id: string, reason?: string): Promise<Employee> {
  const { data } = await apiClient.post<Employee>(endpoints.employeeOffboard(id), { reason })
  return data
}

export async function listMutations(employeeId: string): Promise<readonly EmployeeMutation[]> {
  const { data } = await apiClient.get<ListEnvelope<EmployeeMutation>>(
    endpoints.employeeMutations(employeeId),
  )
  return data.data
}

export async function createMutation(
  employeeId: string,
  input: MutationFormInput,
): Promise<EmployeeMutation> {
  const { data } = await apiClient.post<EmployeeMutation>(endpoints.employeeMutations(employeeId), input)
  return data
}

export async function listDocuments(employeeId: string): Promise<readonly EmployeeDocument[]> {
  const { data } = await apiClient.get<ListEnvelope<EmployeeDocument>>(
    endpoints.employeeDocuments(employeeId),
  )
  return data.data
}

export async function uploadDocument(
  employeeId: string,
  file: File,
  type: DocumentType,
): Promise<EmployeeDocument> {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  const { data } = await apiClient.post<EmployeeDocument>(endpoints.employeeDocuments(employeeId), form)
  return data
}

export async function downloadDocument(employeeId: string, documentId: string, fileName: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(endpoints.employeeDocumentFile(employeeId, documentId), {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function deleteDocument(employeeId: string, documentId: string): Promise<void> {
  await apiClient.delete(endpoints.employeeDocument(employeeId, documentId))
}

export async function listMyChangeRequests(): Promise<readonly ChangeRequest[]> {
  const { data } = await apiClient.get<ListEnvelope<ChangeRequest>>(endpoints.myChangeRequests)
  return data.data
}

export async function createChangeRequest(input: {
  readonly address?: string
  readonly phone?: string
  readonly emergencyContact?: string
}): Promise<ChangeRequest> {
  const { data } = await apiClient.post<ChangeRequest>(endpoints.myChangeRequests, input)
  return data
}

export async function listChangeRequests(
  status: ChangeRequestStatus = 'PENDING',
): Promise<readonly ChangeRequestInboxItem[]> {
  const { data } = await apiClient.get<ListEnvelope<ChangeRequestInboxItem>>(endpoints.changeRequests, {
    params: { status },
  })
  return data.data
}

export async function approveChangeRequest(id: string, reviewNote?: string): Promise<ChangeRequest> {
  const { data } = await apiClient.post<ChangeRequest>(endpoints.approveChangeRequest(id), { reviewNote })
  return data
}

export async function rejectChangeRequest(id: string, reviewNote?: string): Promise<ChangeRequest> {
  const { data } = await apiClient.post<ChangeRequest>(endpoints.rejectChangeRequest(id), { reviewNote })
  return data
}
