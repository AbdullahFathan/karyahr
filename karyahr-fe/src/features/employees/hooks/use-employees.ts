import { useMutation, useQuery } from '@tanstack/react-query'
import {
  approveChangeRequest,
  createChangeRequest,
  createEmployee,
  createMutation,
  deleteDocument,
  getEmployee,
  getMyEmployee,
  listChangeRequests,
  listDocuments,
  listEmployees,
  listMutations,
  listMyChangeRequests,
  offboardEmployee,
  rejectChangeRequest,
  updateEmployee,
  uploadDocument,
} from '@/features/employees/api/employees'
import type { ChangeRequestStatus, DocumentType, EmployeeListFilters } from '@/features/employees/types'
import type { EmployeeFormInput, MutationFormInput } from '@/features/employees/schema'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

export function useEmployees(filters: EmployeeListFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => listEmployees(filters),
    enabled,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => getEmployee(id),
    enabled: Boolean(id),
  })
}

export function useMyEmployee() {
  return useQuery({
    queryKey: queryKeys.employees.me,
    queryFn: getMyEmployee,
  })
}

export function useCreateEmployee() {
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
  })
}

export function useUpdateEmployee(id: string) {
  return useMutation({
    mutationFn: (input: Partial<EmployeeFormInput>) => updateEmployee(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
      ])
    },
  })
}

export function useOffboardEmployee(id: string) {
  return useMutation({
    mutationFn: (reason?: string) => offboardEmployee(id, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
      ])
    },
  })
}

export function useEmployeeDocuments(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.documents(id),
    queryFn: () => listDocuments(id),
    enabled: Boolean(id),
  })
}

export function useUploadDocument(id: string) {
  return useMutation({
    mutationFn: (input: { file: File; type: DocumentType }) => uploadDocument(id, input.file, input.type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.documents(id) }),
  })
}

export function useDeleteDocument(id: string) {
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(id, documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.documents(id) }),
  })
}

export function useEmployeeMutations(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.mutations(id),
    queryFn: () => listMutations(id),
    enabled: Boolean(id),
  })
}

export function useCreateMutation(id: string) {
  return useMutation({
    mutationFn: (input: MutationFormInput) => createMutation(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.mutations(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) }),
      ])
    },
  })
}

export function useMyChangeRequests() {
  return useQuery({
    queryKey: queryKeys.employees.myChangeRequests,
    queryFn: listMyChangeRequests,
  })
}

export function useCreateChangeRequest() {
  return useMutation({
    mutationFn: createChangeRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees.myChangeRequests }),
  })
}

export function useChangeRequestInbox(status: ChangeRequestStatus) {
  return useQuery({
    queryKey: queryKeys.employees.changeRequests(status),
    queryFn: () => listChangeRequests(status),
  })
}

export function useReviewChangeRequest() {
  return useMutation({
    mutationFn: (input: { id: string; action: 'approve' | 'reject'; reviewNote?: string }) =>
      input.action === 'approve'
        ? approveChangeRequest(input.id, input.reviewNote)
        : rejectChangeRequest(input.id, input.reviewNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees', 'change-requests'] }),
  })
}
