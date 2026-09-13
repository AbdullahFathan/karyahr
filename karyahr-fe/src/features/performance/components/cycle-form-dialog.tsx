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
import { toDateInputValue } from '@/lib/dates'
import { createCycleSchema, type CreateCycleFormInput } from '@/features/performance/schema'
import { PERFORMANCE_PERIOD_TYPES, type PerformanceCycle } from '@/features/performance/types'

type CycleFormDialogProps = {
  readonly open: boolean
  readonly cycle: PerformanceCycle | null
  readonly submitting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: CreateCycleFormInput) => void
}

export function CycleFormDialog({
  open,
  cycle,
  submitting,
  onOpenChange,
  onSubmit,
}: CycleFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState(cycle?.name ?? '')
  const [periodType, setPeriodType] = useState(cycle?.periodType ?? 'QUARTERLY')
  const [startsAt, setStartsAt] = useState(cycle ? toDateInputValue(cycle.startsAt) : '')
  const [endsAt, setEndsAt] = useState(cycle ? toDateInputValue(cycle.endsAt) : '')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = createCycleSchema.safeParse({ name, periodType, startsAt, endsAt })
    if (!parsed.success) {
      setFormError('Fill name, period, and dates.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cycle ? 'Edit cycle' : 'Create cycle'}</DialogTitle>
          <DialogDescription>DRAFT cycles can be edited until they are opened.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cycle-name">Name</FieldLabel>
              <Input id="cycle-name" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Period</FieldLabel>
              <Select
                value={periodType}
                onValueChange={(value) => setPeriodType(value as CreateCycleFormInput['periodType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PERFORMANCE_PERIOD_TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="cycle-start">Starts</FieldLabel>
              <Input
                id="cycle-start"
                type="date"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cycle-end">Ends</FieldLabel>
              <Input
                id="cycle-end"
                type="date"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
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
