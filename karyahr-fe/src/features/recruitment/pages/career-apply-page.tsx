import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { careerApplyFormSchema } from '@/features/recruitment/schema'
import { useApplyToCareer, usePublicCareer } from '@/features/recruitment/hooks/use-recruitment'
import { FILE_TYPE_NOT_ALLOWED, UPLOAD_ACCEPT, isAllowedUpload } from '@/lib/upload'
import { getApiErrorMessage } from '@/lib/api-error'

export function CareerApplyPage() {
  const { slug = '' } = useParams()
  const { data: job, isPending, isError, error } = usePublicCareer(slug)
  const applyMutation = useApplyToCareer(slug)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    file: undefined as File | undefined,
  })

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} notFoundTitle="Role not found" />
  }
  if (!job) {
    return <EmptyState title="Role not found" />
  }

  if (submitted) {
    return (
      <EmptyState
        title="Application sent"
        description="Thank you. We will contact you if your profile matches this role."
      />
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = careerApplyFormSchema.safeParse({
      ...values,
      nationalId: values.nationalId.trim() || undefined,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Fill every required field.')
      return
    }
    if (parsed.data.file && !isAllowedUpload(parsed.data.file)) {
      setFormError(FILE_TYPE_NOT_ALLOWED)
      return
    }
    applyMutation.mutate(parsed.data, {
      onSuccess: () => setSubmitted(true),
      onError: (cause) => setFormError(getApiErrorMessage(cause)),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Apply — {job.title}</h1>
        <Button variant="link" className="px-0" asChild>
          <Link to={`/careers/${job.slug}`}>Back to role</Link>
        </Button>
      </div>
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
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
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
          <FieldLabel htmlFor="nationalId">National ID (optional)</FieldLabel>
          <Input
            id="nationalId"
            value={values.nationalId}
            onChange={(event) => setValues((current) => ({ ...current, nationalId: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="file">Resume (optional)</FieldLabel>
          <Input
            id="file"
            type="file"
            accept={UPLOAD_ACCEPT}
            onChange={(event) =>
              setValues((current) => ({ ...current, file: event.target.files?.[0] }))
            }
          />
        </Field>
        {formError ? <FieldError>{formError}</FieldError> : null}
      </FieldGroup>
      <Button type="submit" className="w-fit" disabled={applyMutation.isPending}>
        {applyMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
        Submit application
      </Button>
    </form>
  )
}
