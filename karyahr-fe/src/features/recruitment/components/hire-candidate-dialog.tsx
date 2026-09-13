import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Textarea } from '@/components/ui/textarea'
import { hireCandidateFormSchema, type HireCandidateFormInput } from '@/features/recruitment/schema'
import { CONTRACT_TYPES, type Employee } from '@/features/employees/types'
import { todayJakarta } from '@/lib/dates'

type HireCandidateDialogProps = {
  readonly open: boolean
  readonly submitting: boolean
  readonly candidateName: string
  readonly defaultNationalId: string | null
  readonly defaultPhone: string
  readonly managers: readonly Employee[]
  readonly temporaryPassword: string | null
  readonly employeeId: string | null
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: HireCandidateFormInput) => void
}

export function HireCandidateDialog({
  open,
  submitting,
  candidateName,
  defaultNationalId,
  defaultPhone,
  managers,
  temporaryPassword,
  employeeId,
  onOpenChange,
  onSubmit,
}: HireCandidateDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [values, setValues] = useState({
    nationalId: defaultNationalId ?? '',
    birthDate: '',
    address: '',
    phone: defaultPhone,
    emergencyContact: '',
    employeeNumber: '',
    managerId: '',
    joinedAt: todayJakarta(),
    contractType: 'PERMANENT' as (typeof CONTRACT_TYPES)[number],
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = hireCandidateFormSchema.safeParse({
      ...values,
      nationalId: values.nationalId.trim() || undefined,
      phone: values.phone.trim() || undefined,
      employeeNumber: values.employeeNumber.trim() || undefined,
      managerId: values.managerId || null,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Fill every required field.')
      return
    }
    onSubmit(parsed.data)
  }

  async function copyPassword() {
    if (!temporaryPassword) {
      return
    }
    await navigator.clipboard.writeText(temporaryPassword)
    setCopied(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {temporaryPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Employee created</DialogTitle>
              <DialogDescription>
                Copy this temporary password now. It is not stored and will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <p className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">{temporaryPassword}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void copyPassword()}>
                  {copied ? 'Copied' : 'Copy password'}
                </Button>
                {employeeId ? (
                  <>
                    <Button variant="outline" asChild>
                      <Link to={`/employees/${employeeId}`}>Open employee</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to={`/onboarding/${employeeId}`}>Open onboarding</Link>
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Hire {candidateName}</DialogTitle>
              <DialogDescription>Creates an employee, login, and onboarding process.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="nationalId">National ID</FieldLabel>
                  <Input
                    id="nationalId"
                    value={values.nationalId}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, nationalId: event.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="birthDate">Birth date</FieldLabel>
                  <Input
                    id="birthDate"
                    type="date"
                    value={values.birthDate}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, birthDate: event.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address">Address</FieldLabel>
                  <Textarea
                    id="address"
                    value={values.address}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, address: event.target.value }))
                    }
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
                  <FieldLabel htmlFor="employeeNumber">Employee number (optional)</FieldLabel>
                  <Input
                    id="employeeNumber"
                    value={values.employeeNumber}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, employeeNumber: event.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Manager (optional)</FieldLabel>
                  <Select
                    value={values.managerId || 'none'}
                    onValueChange={(value) =>
                      setValues((current) => ({ ...current, managerId: value === 'none' ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">No manager</SelectItem>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.fullName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="joinedAt">Joined at</FieldLabel>
                  <Input
                    id="joinedAt"
                    type="date"
                    value={values.joinedAt}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, joinedAt: event.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Contract type</FieldLabel>
                  <Select
                    value={values.contractType}
                    onValueChange={(value) =>
                      setValues((current) => ({
                        ...current,
                        contractType: value as (typeof CONTRACT_TYPES)[number],
                      }))
                    }
                  >
                    <SelectTrigger>
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
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner data-icon="inline-start" /> : null}
                  Hire
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
