import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { leavePolicyFormSchema, type LeavePolicyFormInput } from '@/features/leave/schema'
import type { LeavePolicy, LeaveType } from '@/features/leave/types'
import type { Department, Position } from '@/features/organization/types'

type LeavePolicyFormDialogProps = {
  readonly open: boolean
  readonly policy: LeavePolicy | null
  readonly types: readonly LeaveType[]
  readonly departments: readonly Department[]
  readonly positions: readonly Position[]
  readonly submitting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: LeavePolicyFormInput) => void
}

export function LeavePolicyFormDialog({
  open,
  policy,
  types,
  departments,
  positions,
  submitting,
  onOpenChange,
  onSubmit,
}: LeavePolicyFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    leaveTypeId: policy?.leaveTypeId ?? '',
    departmentId: policy?.departmentId ?? '',
    positionId: policy?.positionId ?? '',
    annualAllowanceDays: String(policy?.annualAllowanceDays ?? 12),
    approvalLevelCount: String(policy?.approvalLevelCount ?? 1),
    accrualPerMonth: String(policy?.accrualPerMonth ?? 0),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = leavePolicyFormSchema.safeParse({
      ...values,
      departmentId: values.departmentId || null,
      positionId: values.positionId || null,
    })
    if (!parsed.success) {
      setFormError('Fill leave type and allowance.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{policy ? 'Edit leave policy' : 'Create leave policy'}</DialogTitle>
          <DialogDescription>Approval levels are 1 or 2.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Leave type</FieldLabel>
              <Select
                value={values.leaveTypeId || undefined}
                onValueChange={(value) => setValues((current) => ({ ...current, leaveTypeId: value }))}
                disabled={Boolean(policy)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Department</FieldLabel>
              <Select
                value={values.departmentId || 'none'}
                onValueChange={(value) =>
                  setValues((current) => ({ ...current, departmentId: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Any department</SelectItem>
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
                value={values.positionId || 'none'}
                onValueChange={(value) =>
                  setValues((current) => ({ ...current, positionId: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Any position</SelectItem>
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
              <FieldLabel htmlFor="allowance">Annual allowance days</FieldLabel>
              <Input
                id="allowance"
                type="number"
                min={0}
                value={values.annualAllowanceDays}
                onChange={(event) =>
                  setValues((current) => ({ ...current, annualAllowanceDays: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="levels">Approval levels</FieldLabel>
              <Input
                id="levels"
                type="number"
                min={1}
                max={2}
                value={values.approvalLevelCount}
                onChange={(event) =>
                  setValues((current) => ({ ...current, approvalLevelCount: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="accrual">Accrual per month</FieldLabel>
              <Input
                id="accrual"
                type="number"
                min={0}
                value={values.accrualPerMonth}
                onChange={(event) =>
                  setValues((current) => ({ ...current, accrualPerMonth: event.target.value }))
                }
              />
            </Field>
            {formError ? <FieldError>{formError}</FieldError> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
