import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { employeeFormSchema, type EmployeeFormInput } from '@/features/employees/schema'
import { CONTRACT_TYPES, EMPLOYEE_STATUSES, type Employee } from '@/features/employees/types'
import type { Department, Position } from '@/features/organization/types'
import { toDateInputValue } from '@/lib/dates'

type EmployeeFormProps = {
  readonly departments: readonly Department[]
  readonly positions: readonly Position[]
  readonly managers: readonly Employee[]
  readonly initial?: Employee
  readonly submitting: boolean
  readonly submitLabel: string
  readonly onSubmit: (input: EmployeeFormInput) => void
}

export function EmployeeForm({
  departments,
  positions,
  managers,
  initial,
  submitting,
  submitLabel,
  onSubmit,
}: EmployeeFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    fullName: initial?.fullName ?? '',
    nationalId: initial?.nationalId ?? '',
    birthDate: initial ? toDateInputValue(initial.birthDate) : '',
    address: initial?.address ?? '',
    phone: initial?.phone ?? '',
    emergencyContact: initial?.emergencyContact ?? '',
    employeeNumber: initial?.employeeNumber ?? '',
    departmentId: initial?.departmentId ?? '',
    positionId: initial?.positionId ?? '',
    managerId: initial?.managerId ?? '',
    joinedAt: initial ? toDateInputValue(initial.joinedAt) : '',
    status: initial?.status ?? 'ACTIVE',
    contractType: initial?.contractType ?? 'PERMANENT',
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = employeeFormSchema.safeParse({
      ...values,
      managerId: values.managerId || null,
    })
    if (!parsed.success) {
      setFormError('Fill every required field.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input
            id="fullName"
            value={values.fullName}
            onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="nationalId">National ID</FieldLabel>
          <Input
            id="nationalId"
            value={values.nationalId}
            onChange={(event) => setValues((current) => ({ ...current, nationalId: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="employeeNumber">Employee number</FieldLabel>
          <Input
            id="employeeNumber"
            value={values.employeeNumber}
            onChange={(event) => setValues((current) => ({ ...current, employeeNumber: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="birthDate">Birth date</FieldLabel>
          <Input
            id="birthDate"
            type="date"
            value={values.birthDate}
            onChange={(event) => setValues((current) => ({ ...current, birthDate: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="joinedAt">Joined at</FieldLabel>
          <Input
            id="joinedAt"
            type="date"
            value={values.joinedAt}
            onChange={(event) => setValues((current) => ({ ...current, joinedAt: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input
            id="phone"
            value={values.phone}
            onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="emergencyContact">Emergency contact</FieldLabel>
          <Input
            id="emergencyContact"
            value={values.emergencyContact}
            onChange={(event) =>
              setValues((current) => ({ ...current, emergencyContact: event.target.value }))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Textarea
            id="address"
            value={values.address}
            onChange={(event) => setValues((current) => ({ ...current, address: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel>Department</FieldLabel>
          <Select
            value={values.departmentId || undefined}
            onValueChange={(value) => setValues((current) => ({ ...current, departmentId: value ?? '' }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Position</FieldLabel>
          <Select
            value={values.positionId || undefined}
            onValueChange={(value) => setValues((current) => ({ ...current, positionId: value ?? '' }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Manager</FieldLabel>
          <Select
            value={values.managerId || 'none'}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, managerId: value === 'none' ? '' : (value ?? '') }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">None</SelectItem>
                {managers
                  .filter((employee) => employee.id !== initial?.id)
                  .map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Status</FieldLabel>
          <Select
            value={values.status}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                status: (value ?? current.status) as EmployeeFormInput['status'],
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {EMPLOYEE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Contract type</FieldLabel>
          <Select
            value={values.contractType}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                contractType: (value ?? current.contractType) as EmployeeFormInput['contractType'],
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CONTRACT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {formError ? <FieldError>{formError}</FieldError> : null}
      </FieldGroup>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Spinner data-icon="inline-start" /> : null}
        {submitLabel}
      </Button>
    </form>
  )
}
