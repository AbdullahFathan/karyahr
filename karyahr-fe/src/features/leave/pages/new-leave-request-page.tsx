import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { leaveRequestFormSchema } from '@/features/leave/schema'
import { useCreateLeaveRequest, useLeaveTypes, useMyLeaveBalances } from '@/features/leave/hooks/use-leave'
import { FILE_TYPE_NOT_ALLOWED, UPLOAD_ACCEPT, isAllowedUpload } from '@/lib/upload'
import { todayJakarta } from '@/lib/dates'

export function NewLeaveRequestPage() {
  const navigate = useNavigate()
  const { data: types } = useLeaveTypes()
  const { data: balances } = useMyLeaveBalances()
  const createMutation = useCreateLeaveRequest()
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    leaveTypeId: '',
    startDate: todayJakarta(),
    endDate: todayJakarta(),
    reason: '',
    file: undefined as File | undefined,
  })
  const selectedType = (types ?? []).find((type) => type.id === values.leaveTypeId)
  const typeName = new Map((types ?? []).map((item) => [item.id, item.name]))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = leaveRequestFormSchema.safeParse({
      ...values,
      requiresAttachment: selectedType?.requiresAttachment ?? false,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the form.')
      return
    }
    if (parsed.data.file && !isAllowedUpload(parsed.data.file)) {
      setFormError(FILE_TYPE_NOT_ALLOWED)
      return
    }
    createMutation.mutate(
      {
        leaveTypeId: parsed.data.leaveTypeId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        reason: parsed.data.reason,
        file: parsed.data.file,
      },
      { onSuccess: () => navigate('/leave') },
    )
  }

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_16rem]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FieldGroup>
          <Field>
            <FieldLabel>Leave type</FieldLabel>
            <Select
              value={values.leaveTypeId || undefined}
              onValueChange={(value) => setValues((current) => ({ ...current, leaveTypeId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(types ?? [])
                    .filter((type) => type.isActive)
                    .map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="leave-start">Start date</FieldLabel>
            <Input
              id="leave-start"
              type="date"
              value={values.startDate}
              onChange={(event) => setValues((current) => ({ ...current, startDate: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="leave-end">End date</FieldLabel>
            <Input
              id="leave-end"
              type="date"
              value={values.endDate}
              onChange={(event) => setValues((current) => ({ ...current, endDate: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="leave-reason">Reason</FieldLabel>
            <Textarea
              id="leave-reason"
              value={values.reason}
              onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="leave-file">
              Attachment {selectedType?.requiresAttachment ? '(required)' : '(optional)'}
            </FieldLabel>
            <Input
              id="leave-file"
              type="file"
              accept={UPLOAD_ACCEPT}
              onChange={(event) =>
                setValues((current) => ({ ...current, file: event.target.files?.[0] ?? undefined }))
              }
            />
          </Field>
          {formError ? <FieldError>{formError}</FieldError> : null}
        </FieldGroup>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
          Submit request
        </Button>
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {(balances ?? []).length === 0 ? (
            <p className="text-muted-foreground">No balances</p>
          ) : (
            (balances ?? []).map((balance) => (
              <p key={balance.id}>
                {typeName.get(balance.leaveTypeId) ?? balance.leaveTypeId}: {balance.entitledDays - balance.usedDays}{' '}
                remaining
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
