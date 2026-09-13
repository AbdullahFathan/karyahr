import { type FormEvent, useEffect, useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRupiah } from '@/features/payroll/format'
import {
  useCreateSalaryAssignment,
  usePayrollProfile,
  useSalaryAssignments,
  useSalaryComponents,
  useUpsertPayrollProfile,
} from '@/features/payroll/hooks/use-payroll'
import {
  payrollProfileFormSchema,
  salaryAssignmentFormSchema,
} from '@/features/payroll/schema'
import { PTKP_STATUSES, TAX_METHODS } from '@/features/payroll/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue, todayJakarta } from '@/lib/dates'

type EmployeePayrollTabProps = {
  readonly employeeId: string
}

export function EmployeePayrollTab({ employeeId }: EmployeePayrollTabProps) {
  const canListComponents = useHasPermission(PERMISSIONS.PAYROLL_COMPONENTS_WRITE)
  const { data: profile, isPending: profilePending } = usePayrollProfile(employeeId)
  const { data: assignments, isPending: assignmentsPending } = useSalaryAssignments(employeeId)
  const { data: components } = useSalaryComponents(canListComponents)
  const upsertMutation = useUpsertPayrollProfile(employeeId)
  const assignMutation = useCreateSalaryAssignment(employeeId)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [profileValues, setProfileValues] = useState({
    ptkpStatus: profile?.ptkpStatus ?? 'TK_0',
    taxMethod: profile?.taxMethod ?? 'GROSS',
    npwp: profile?.npwp ?? '',
    bankName: profile?.bankName ?? '',
    bankAccountNumber: profile?.bankAccountNumber ?? '',
    bankAccountName: profile?.bankAccountName ?? '',
    bpjsKesehatanEnrolled: profile?.bpjsKesehatanEnrolled ?? true,
    bpjsTkEnrolled: profile?.bpjsTkEnrolled ?? true,
  })
  const [assignmentValues, setAssignmentValues] = useState({
    componentId: '',
    amountRupiah: '',
    effectiveFrom: todayJakarta(),
    effectiveTo: '',
  })

  useEffect(() => {
    if (!profile) {
      return
    }
    setProfileValues({
      ptkpStatus: profile.ptkpStatus,
      taxMethod: profile.taxMethod,
      npwp: profile.npwp ?? '',
      bankName: profile.bankName,
      bankAccountNumber: profile.bankAccountNumber,
      bankAccountName: profile.bankAccountName,
      bpjsKesehatanEnrolled: profile.bpjsKesehatanEnrolled,
      bpjsTkEnrolled: profile.bpjsTkEnrolled,
    })
  }, [profile])

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError(null)
    const parsed = payrollProfileFormSchema.safeParse({
      employeeId,
      ...profileValues,
    })
    if (!parsed.success) {
      setProfileError('Fill PTKP, tax method, and bank details.')
      return
    }
    upsertMutation.mutate(parsed.data)
  }

  function handleAssignmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAssignmentError(null)
    const parsed = salaryAssignmentFormSchema.safeParse({
      employeeId,
      ...assignmentValues,
    })
    if (!parsed.success) {
      setAssignmentError('Choose a component and enter an integer rupiah amount.')
      return
    }
    assignMutation.mutate(parsed.data, {
      onSuccess: () =>
        setAssignmentValues({
          componentId: '',
          amountRupiah: '',
          effectiveFrom: todayJakarta(),
          effectiveTo: '',
        }),
    })
  }

  if (profilePending) {
    return <Loader />
  }

  const componentName = new Map((components ?? []).map((item) => [item.id, `${item.code} — ${item.name}`]))

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleProfileSubmit} className="flex max-w-xl flex-col gap-4">
        <h3 className="font-heading text-lg font-semibold">Payroll profile</h3>
        {!profile ? (
          <p className="text-sm text-muted-foreground">No profile yet. Save one before running payroll.</p>
        ) : null}
        <FieldGroup>
          <Field>
            <FieldLabel>PTKP status</FieldLabel>
            <Select
              value={profileValues.ptkpStatus}
              onValueChange={(value) =>
                setProfileValues((current) => ({ ...current, ptkpStatus: value as (typeof PTKP_STATUSES)[number] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PTKP_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Tax method</FieldLabel>
            <Select
              value={profileValues.taxMethod}
              onValueChange={(value) =>
                setProfileValues((current) => ({ ...current, taxMethod: value as (typeof TAX_METHODS)[number] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TAX_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="npwp">NPWP (optional)</FieldLabel>
            <Input
              id="npwp"
              value={profileValues.npwp}
              onChange={(event) => setProfileValues((current) => ({ ...current, npwp: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bankName">Bank name</FieldLabel>
            <Input
              id="bankName"
              value={profileValues.bankName}
              onChange={(event) => setProfileValues((current) => ({ ...current, bankName: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bankAccountNumber">Account number</FieldLabel>
            <Input
              id="bankAccountNumber"
              value={profileValues.bankAccountNumber}
              onChange={(event) =>
                setProfileValues((current) => ({ ...current, bankAccountNumber: event.target.value }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bankAccountName">Account name</FieldLabel>
            <Input
              id="bankAccountName"
              value={profileValues.bankAccountName}
              onChange={(event) =>
                setProfileValues((current) => ({ ...current, bankAccountName: event.target.value }))
              }
            />
          </Field>
          <Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="bpjsKes"
                checked={profileValues.bpjsKesehatanEnrolled}
                onCheckedChange={(checked) =>
                  setProfileValues((current) => ({ ...current, bpjsKesehatanEnrolled: checked === true }))
                }
              />
              <FieldLabel htmlFor="bpjsKes">BPJS Kesehatan enrolled</FieldLabel>
            </div>
          </Field>
          <Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="bpjsTk"
                checked={profileValues.bpjsTkEnrolled}
                onCheckedChange={(checked) =>
                  setProfileValues((current) => ({ ...current, bpjsTkEnrolled: checked === true }))
                }
              />
              <FieldLabel htmlFor="bpjsTk">BPJS Ketenagakerjaan enrolled</FieldLabel>
            </div>
          </Field>
          {profileError ? <FieldError>{profileError}</FieldError> : null}
        </FieldGroup>
        <Button type="submit" disabled={upsertMutation.isPending} className="w-fit">
          {upsertMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
          Save profile
        </Button>
      </form>

      <div className="flex flex-col gap-4">
        <h3 className="font-heading text-lg font-semibold">Salary assignments</h3>
        <form onSubmit={handleAssignmentSubmit} className="flex max-w-xl flex-col gap-3">
          <Field>
            <FieldLabel>Component</FieldLabel>
            <Select
              value={assignmentValues.componentId || undefined}
              onValueChange={(value) =>
                setAssignmentValues((current) => ({ ...current, componentId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select component" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(components ?? [])
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} — {item.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="amountRupiah">Amount (IDR, integer)</FieldLabel>
            <Input
              id="amountRupiah"
              inputMode="numeric"
              value={assignmentValues.amountRupiah}
              onChange={(event) =>
                setAssignmentValues((current) => ({
                  ...current,
                  amountRupiah: event.target.value.replace(/\D/g, ''),
                }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="effectiveFrom">Effective from</FieldLabel>
            <Input
              id="effectiveFrom"
              type="date"
              value={assignmentValues.effectiveFrom}
              onChange={(event) =>
                setAssignmentValues((current) => ({ ...current, effectiveFrom: event.target.value }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="effectiveTo">Effective to (optional)</FieldLabel>
            <Input
              id="effectiveTo"
              type="date"
              value={assignmentValues.effectiveTo}
              onChange={(event) =>
                setAssignmentValues((current) => ({ ...current, effectiveTo: event.target.value }))
              }
            />
          </Field>
          {assignmentError ? <FieldError>{assignmentError}</FieldError> : null}
          <Button type="submit" disabled={assignMutation.isPending} className="w-fit">
            {assignMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
            Add assignment
          </Button>
        </form>
        {assignmentsPending ? (
          <Loader />
        ) : !assignments || assignments.length === 0 ? (
          <EmptyState title="No salary assignments" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    {componentName.get(assignment.componentId) ?? assignment.componentId}
                  </TableCell>
                  <TableCell>{formatRupiah(assignment.amountRupiah)}</TableCell>
                  <TableCell>{toDateInputValue(assignment.effectiveFrom)}</TableCell>
                  <TableCell>
                    {assignment.effectiveTo ? toDateInputValue(assignment.effectiveTo) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
