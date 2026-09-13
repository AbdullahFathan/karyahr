import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createPayrollRun,
  createSalaryAssignment,
  createSalaryComponent,
  downloadPayrollExport,
  downloadPayslipPdf,
  getPayrollProfile,
  getPayrollRun,
  getPayslip,
  listMyPayslips,
  listPayrollRuns,
  listRunPayslips,
  listSalaryAssignments,
  listSalaryComponents,
  updateSalaryComponent,
  upsertPayrollProfile,
} from '@/features/payroll/api/payroll'
import { isTerminalPayrollStatus } from '@/features/payroll/format'
import type { SalaryComponentFormInput } from '@/features/payroll/schema'
import type { PaginationQuery } from '@/types/api'
import { queryClient } from '@/services/query/query-client'
import { queryKeys } from '@/services/query/query-keys'

const RUN_POLL_MS = 2_000

function invalidatePayroll() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all })
}

export function useSalaryComponents(enabled = true) {
  return useQuery({
    queryKey: queryKeys.payroll.components,
    queryFn: listSalaryComponents,
    enabled,
  })
}

export function useCreateSalaryComponent() {
  return useMutation({
    mutationFn: createSalaryComponent,
    onSuccess: invalidatePayroll,
  })
}

export function useUpdateSalaryComponent() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SalaryComponentFormInput> }) =>
      updateSalaryComponent(id, input),
    onSuccess: invalidatePayroll,
  })
}

export function usePayrollProfile(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payroll.profile(employeeId),
    queryFn: () => getPayrollProfile(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useUpsertPayrollProfile(employeeId: string) {
  return useMutation({
    mutationFn: upsertPayrollProfile,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payroll.profile(employeeId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all }),
      ]),
  })
}

export function useSalaryAssignments(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payroll.assignments(employeeId),
    queryFn: () => listSalaryAssignments(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useCreateSalaryAssignment(employeeId: string) {
  return useMutation({
    mutationFn: createSalaryAssignment,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.assignments(employeeId) }),
  })
}

export function usePayrollRuns(query: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.payroll.runs(query),
    queryFn: () => listPayrollRuns(query),
  })
}

export function useCreatePayrollRun() {
  return useMutation({
    mutationFn: createPayrollRun,
    onSuccess: invalidatePayroll,
  })
}

export function usePayrollRun(id: string) {
  return useQuery({
    queryKey: queryKeys.payroll.run(id),
    queryFn: () => getPayrollRun(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || isTerminalPayrollStatus(status)) {
        return false
      }
      return RUN_POLL_MS
    },
  })
}

export function useRunPayslips(id: string, query: PaginationQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payroll.runPayslips(id, query),
    queryFn: () => listRunPayslips(id, query),
    enabled: enabled && Boolean(id),
  })
}

export function useMyPayslips(query: PaginationQuery & { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.payslips.me(query),
    queryFn: () => listMyPayslips(query),
  })
}

export function usePayslip(id: string) {
  return useQuery({
    queryKey: queryKeys.payslips.detail(id),
    queryFn: () => getPayslip(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const slip = query.state.data
      if (!slip || slip.pdfObjectKey) {
        return false
      }
      return RUN_POLL_MS
    },
  })
}

export function useDownloadPayslipPdf() {
  return useMutation({
    mutationFn: downloadPayslipPdf,
  })
}

export function useDownloadPayrollExport() {
  return useMutation({
    mutationFn: ({
      runId,
      kind,
      year,
    }: {
      runId: string
      kind: 'accounting' | 'pph21' | 'a1' | 'bank'
      year?: number
    }) => downloadPayrollExport(runId, kind, year),
  })
}
