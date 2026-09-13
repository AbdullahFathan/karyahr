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
import { Spinner } from '@/components/ui/spinner'
import { leaveTypeFormSchema, type LeaveTypeFormInput } from '@/features/leave/schema'
import type { LeaveType } from '@/features/leave/types'

type LeaveTypeFormDialogProps = {
  readonly open: boolean
  readonly leaveType: LeaveType | null
  readonly submitting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: LeaveTypeFormInput) => void
}

export function LeaveTypeFormDialog({
  open,
  leaveType,
  submitting,
  onOpenChange,
  onSubmit,
}: LeaveTypeFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    code: leaveType?.code ?? '',
    name: leaveType?.name ?? '',
    requiresBalance: leaveType?.requiresBalance ?? true,
    requiresAttachment: leaveType?.requiresAttachment ?? false,
    isActive: leaveType?.isActive ?? true,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = leaveTypeFormSchema.safeParse(values)
    if (!parsed.success) {
      setFormError('Fill code and name.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{leaveType ? 'Edit leave type' : 'Create leave type'}</DialogTitle>
          <DialogDescription>Code, name, and policy flags.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="lt-code">Code</FieldLabel>
              <Input
                id="lt-code"
                value={values.code}
                onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lt-name">Name</FieldLabel>
              <Input
                id="lt-name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lt-balance"
                  checked={values.requiresBalance}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, requiresBalance: checked === true }))
                  }
                />
                <FieldLabel htmlFor="lt-balance">Requires balance</FieldLabel>
              </div>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lt-file"
                  checked={values.requiresAttachment}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, requiresAttachment: checked === true }))
                  }
                />
                <FieldLabel htmlFor="lt-file">Requires attachment</FieldLabel>
              </div>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lt-active"
                  checked={values.isActive}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, isActive: checked === true }))
                  }
                />
                <FieldLabel htmlFor="lt-active">Active</FieldLabel>
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
