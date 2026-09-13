import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { salaryComponentFormSchema, type SalaryComponentFormInput } from '@/features/payroll/schema'
import { SALARY_COMPONENT_KINDS, type SalaryComponent } from '@/features/payroll/types'

type SalaryComponentFormDialogProps = {
  readonly open: boolean
  readonly component: SalaryComponent | null
  readonly submitting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: SalaryComponentFormInput) => void
}

export function SalaryComponentFormDialog({
  open,
  component,
  submitting,
  onOpenChange,
  onSubmit,
}: SalaryComponentFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    code: component?.code ?? '',
    name: component?.name ?? '',
    kind: component?.kind ?? 'BASIC',
    isTaxable: component?.isTaxable ?? true,
    isActive: component?.isActive ?? true,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = salaryComponentFormSchema.safeParse(values)
    if (!parsed.success) {
      setFormError('Fill code, name, and kind.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{component ? 'Edit salary component' : 'Create salary component'}</DialogTitle>
          <DialogDescription>BASIC components must stay taxable.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sc-code">Code</FieldLabel>
              <Input
                id="sc-code"
                value={values.code}
                onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sc-name">Name</FieldLabel>
              <Input
                id="sc-name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Kind</FieldLabel>
              <Select
                value={values.kind}
                onValueChange={(kind) =>
                  setValues((current) => ({
                    ...current,
                    kind: kind as (typeof SALARY_COMPONENT_KINDS)[number],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SALARY_COMPONENT_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {kind}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sc-taxable"
                  checked={values.isTaxable}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, isTaxable: checked === true }))
                  }
                />
                <FieldLabel htmlFor="sc-taxable">Taxable</FieldLabel>
              </div>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sc-active"
                  checked={values.isActive}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, isActive: checked === true }))
                  }
                />
                <FieldLabel htmlFor="sc-active">Active</FieldLabel>
              </div>
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
