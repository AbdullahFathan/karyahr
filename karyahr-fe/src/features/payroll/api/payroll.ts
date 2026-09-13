import axios from 'axios'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { toPaginationQuery } from '@/lib/pagination'
import { getApiErrorMessage } from '@/lib/api-error'
import type { ApiEnvelope, Paginated, PaginationQuery } from '@/types/api'
import type {
  EmployeePayrollProfile,
  EmployeeSalaryAssignment,
  PayrollRun,
  Payslip,
  SalaryComponent,
} from '@/features/payroll/types'
import type {
  CreatePayrollRunFormInput,
  PayrollProfileFormInput,
  SalaryAssignmentFormInput,
  SalaryComponentFormInput,
} from '@/features/payroll/schema'

async function downloadBlob(url: string, fallbackName: string, params?: Record<string, string | number>): Promise<void> {
  try {
    const response = await apiClient.get<Blob>(url, { params, responseType: 'blob' })
    const disposition = response.headers['content-disposition']
    const fileName = parseContentDisposition(disposition) ?? fallbackName
    const objectUrl = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    link.click()
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    throw await toDownloadError(error)
  }
}

function parseContentDisposition(header: string | undefined): string | null {
  if (!header) {
    return null
  }
  const match = /filename="([^"]+)"/.exec(header)
  return match?.[1] ?? null
}

async function toDownloadError(error: unknown): Promise<Error> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    const text = await error.response.data.text()
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string }
      const message = parsed.message ?? parsed.error
      if (message) {
        return new Error(message)
      }
    } catch {
      // Keep the original error when the blob is not JSON.
    }
  }
  return error instanceof Error ? error : new Error(getApiErrorMessage(error))
}

export async function listSalaryComponents(): Promise<readonly SalaryComponent[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly SalaryComponent[]>>(endpoints.payroll.components)
  return data.data
}

export async function createSalaryComponent(input: SalaryComponentFormInput): Promise<SalaryComponent> {
  const { data } = await apiClient.post<ApiEnvelope<SalaryComponent>>(endpoints.payroll.components, input)
  return data.data
}

export async function updateSalaryComponent(
  id: string,
  input: Partial<SalaryComponentFormInput>,
): Promise<SalaryComponent> {
  const { data } = await apiClient.patch<ApiEnvelope<SalaryComponent>>(endpoints.payroll.component(id), input)
  return data.data
}

export async function getPayrollProfile(employeeId: string): Promise<EmployeePayrollProfile | null> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<EmployeePayrollProfile>>(
      endpoints.payroll.profile(employeeId),
    )
    return data.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function upsertPayrollProfile(input: PayrollProfileFormInput): Promise<EmployeePayrollProfile> {
  const { data } = await apiClient.put<ApiEnvelope<EmployeePayrollProfile>>(endpoints.payroll.profiles, {
    ...input,
    npwp: input.npwp && input.npwp.length > 0 ? input.npwp : null,
  })
  return data.data
}

export async function listSalaryAssignments(employeeId: string): Promise<readonly EmployeeSalaryAssignment[]> {
  const { data } = await apiClient.get<ApiEnvelope<readonly EmployeeSalaryAssignment[]>>(
    endpoints.payroll.assignmentsFor(employeeId),
  )
  return data.data
}

export async function createSalaryAssignment(
  input: SalaryAssignmentFormInput,
): Promise<EmployeeSalaryAssignment> {
  const { data } = await apiClient.post<ApiEnvelope<EmployeeSalaryAssignment>>(endpoints.payroll.assignments, {
    employeeId: input.employeeId,
    componentId: input.componentId,
    amountRupiah: input.amountRupiah,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ? input.effectiveTo : null,
  })
  return data.data
}

export async function listPayrollRuns(query: PaginationQuery = {}): Promise<Paginated<PayrollRun>> {
  const { data } = await apiClient.get<Paginated<PayrollRun>>(endpoints.payroll.runs, {
    params: toPaginationQuery(query),
  })
  return data
}

export async function createPayrollRun(input: CreatePayrollRunFormInput): Promise<PayrollRun> {
  const { data } = await apiClient.post<ApiEnvelope<PayrollRun>>(endpoints.payroll.runs, input)
  return data.data
}

export async function getPayrollRun(id: string): Promise<PayrollRun> {
  const { data } = await apiClient.get<ApiEnvelope<PayrollRun>>(endpoints.payroll.run(id))
  return data.data
}

export async function listRunPayslips(id: string, query: PaginationQuery = {}): Promise<Paginated<Payslip>> {
  const { data } = await apiClient.get<Paginated<Payslip>>(endpoints.payroll.runPayslips(id), {
    params: toPaginationQuery(query),
  })
  return data
}

export async function listMyPayslips(
  query: PaginationQuery & { from?: string; to?: string } = {},
): Promise<Paginated<Payslip>> {
  const pagination = toPaginationQuery(query)
  const { data } = await apiClient.get<Paginated<Payslip>>(endpoints.payslipsMe, {
    params: {
      ...pagination,
      from: query.from || undefined,
      to: query.to || undefined,
    },
  })
  return data
}

export async function getPayslip(id: string): Promise<Payslip> {
  const { data } = await apiClient.get<ApiEnvelope<Payslip>>(endpoints.payslip(id))
  return data.data
}

export async function downloadPayslipPdf(id: string): Promise<void> {
  await downloadBlob(endpoints.payslipPdf(id), `payslip-${id}.pdf`)
}

export async function downloadPayrollExport(
  runId: string,
  kind: 'accounting' | 'pph21' | 'a1' | 'bank',
  year?: number,
): Promise<void> {
  const path =
    kind === 'accounting'
      ? endpoints.payroll.exports.accounting(runId)
      : kind === 'pph21'
        ? endpoints.payroll.exports.pph21(runId)
        : kind === 'a1'
          ? endpoints.payroll.exports.a1(runId)
          : endpoints.payroll.exports.bank(runId)
  const fileName =
    kind === 'accounting'
      ? 'accounting.csv'
      : kind === 'pph21'
        ? 'pph21_monthly.csv'
        : kind === 'a1'
          ? 'pph21_1721_a1.csv'
          : 'bank_transfer.csv'
  await downloadBlob(path, fileName, year !== undefined ? { year } : undefined)
}
