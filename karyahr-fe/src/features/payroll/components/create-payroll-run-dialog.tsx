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
import { createPayrollRunFormSchema, type CreatePayrollRunFormInput } from '@/features/payroll/schema'
import { PAYROLL_PERIOD_TYPES } from '@/features/payroll/types'
import { todayJakarta } from '@/lib/dates'

type CreatePayrollRunDialogProps = {
  readonly open: boolean
  readonly submitting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: CreatePayrollRunFormInput) => void
}

export function CreatePayrollRunDialog({
  open,
  submitting,
  onOpenChange,
  onSubmit,
}: CreatePayrollRunDialogProps) {
  const today = todayJakarta()
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    periodType: 'MONTHLY' as (typeof PAYROLL_PERIOD_TYPES)[number],
    periodStart: today.slice(0, 8) + '01',
    periodEnd: today,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = createPayrollRunFormSchema.safeParse(values)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Enter a valid period.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Queue payroll run</DialogTitle>
          <DialogDescription>Creates a PENDING run and processes it in the background.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Period type</FieldLabel>
              <Select
                value={values.periodType}
                onValueChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    periodType: value as (typeof PAYROLL_PERIOD_TYPES)[number],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PAYROLL_PERIOD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="periodStart">Period start</FieldLabel>
              <Input
                id="periodStart"
                type="date"
                value={values.periodStart}
                onChange={(event) =>
                  setValues((current) => ({ ...current, periodStart: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="periodEnd">Period end</FieldLabel>
              <Input
                id="periodEnd"
                type="date"
                value={values.periodEnd}
                onChange={(event) => setValues((current) => ({ ...current, periodEnd: event.target.value }))}
              />
            </Field>
            {formError ? <FieldError>{formError}</FieldError> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              Queue run
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
