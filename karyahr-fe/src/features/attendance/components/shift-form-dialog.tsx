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
import { shiftFormSchema, type ShiftFormInput } from '@/features/attendance/schema'
import type { Shift } from '@/features/attendance/types'

type ShiftFormDialogProps = {
  readonly open: boolean
  readonly shift: Shift | null
  readonly submitting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: ShiftFormInput) => void
}

export function ShiftFormDialog({ open, shift, submitting, onOpenChange, onSubmit }: ShiftFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    name: shift?.name ?? '',
    code: shift?.code ?? '',
    startMinutes: String(shift?.startMinutes ?? 540),
    endMinutes: String(shift?.endMinutes ?? 1020),
    graceMinutesLate: String(shift?.graceMinutesLate ?? 0),
    graceMinutesEarly: String(shift?.graceMinutesEarly ?? 0),
    overtimeCapMinutes: String(shift?.overtimeCapMinutes ?? 0),
    isFlexible: shift?.isFlexible ?? false,
    isActive: shift?.isActive ?? true,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = shiftFormSchema.safeParse(values)
    if (!parsed.success) {
      setFormError('Check minutes (0–1439) and required fields.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{shift ? 'Edit shift' : 'Create shift'}</DialogTitle>
          <DialogDescription>Minutes are from midnight (0–1439).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="shift-name">Name</FieldLabel>
              <Input
                id="shift-name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="shift-code">Code</FieldLabel>
              <Input
                id="shift-code"
                value={values.code}
                onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="shift-start">Start minutes</FieldLabel>
                <Input
                  id="shift-start"
                  type="number"
                  min={0}
                  max={1439}
                  value={values.startMinutes}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, startMinutes: event.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shift-end">End minutes</FieldLabel>
                <Input
                  id="shift-end"
                  type="number"
                  min={0}
                  max={1439}
                  value={values.endMinutes}
                  onChange={(event) => setValues((current) => ({ ...current, endMinutes: event.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="shift-grace-late">Grace late</FieldLabel>
                <Input
                  id="shift-grace-late"
                  type="number"
                  min={0}
                  max={180}
                  value={values.graceMinutesLate}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, graceMinutesLate: event.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shift-grace-early">Grace early</FieldLabel>
                <Input
                  id="shift-grace-early"
                  type="number"
                  min={0}
                  max={180}
                  value={values.graceMinutesEarly}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, graceMinutesEarly: event.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shift-ot">OT cap</FieldLabel>
                <Input
                  id="shift-ot"
                  type="number"
                  min={0}
                  max={720}
                  value={values.overtimeCapMinutes}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, overtimeCapMinutes: event.target.value }))
                  }
                />
              </Field>
            </div>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="shift-flexible"
                  checked={values.isFlexible}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, isFlexible: checked === true }))
                  }
                />
                <FieldLabel htmlFor="shift-flexible">Flexible</FieldLabel>
              </div>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="shift-active"
                  checked={values.isActive}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, isActive: checked === true }))
                  }
                />
                <FieldLabel htmlFor="shift-active">Active</FieldLabel>
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
