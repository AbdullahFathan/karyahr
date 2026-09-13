import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { jobPostingFormSchema, type JobPostingFormInput } from '@/features/recruitment/schema'
import { JOB_POSTING_STATUSES, type JobPostingDetail } from '@/features/recruitment/types'
import type { Department, Position } from '@/features/organization/types'
import { toDateInputValue } from '@/lib/dates'

type StageDraft = { id?: string; name: string; isTerminal: boolean }

type JobFormProps = {
  readonly departments: readonly Department[]
  readonly positions: readonly Position[]
  readonly initial?: JobPostingDetail
  readonly submitting: boolean
  readonly submitLabel: string
  readonly onSubmit: (input: JobPostingFormInput) => void
}

export function JobForm({
  departments,
  positions,
  initial,
  submitting,
  submitLabel,
  onSubmit,
}: JobFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    qualifications: initial?.qualifications ?? '',
    departmentId: initial?.departmentId ?? '',
    positionId: initial?.positionId ?? '',
    headcount: String(initial?.headcount ?? 1),
    maxApplicants: String(initial?.maxApplicants ?? 20),
    closesAt: initial?.closesAt ? toDateInputValue(initial.closesAt) : '',
    status: initial?.status ?? 'DRAFT',
  })
  const [stages, setStages] = useState<StageDraft[]>(
    initial?.stages.length
      ? initial.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          isTerminal: stage.isTerminal,
        }))
      : [
          { name: 'Screening', isTerminal: false },
          { name: 'Interview', isTerminal: false },
          { name: 'Offering', isTerminal: true },
        ],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = jobPostingFormSchema.safeParse({
      ...values,
      slug: values.slug.trim() || undefined,
      headcount: Number(values.headcount),
      maxApplicants: Number(values.maxApplicants),
      stages: stages.filter((stage) => stage.name.trim().length > 0),
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Fill every required field.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">Slug (optional)</FieldLabel>
          <Input
            id="slug"
            value={values.slug}
            onChange={(event) => setValues((current) => ({ ...current, slug: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="qualifications">Qualifications</FieldLabel>
          <Textarea
            id="qualifications"
            value={values.qualifications}
            onChange={(event) =>
              setValues((current) => ({ ...current, qualifications: event.target.value }))
            }
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
          <FieldLabel htmlFor="headcount">Headcount</FieldLabel>
          <Input
            id="headcount"
            type="number"
            min={1}
            value={values.headcount}
            onChange={(event) => setValues((current) => ({ ...current, headcount: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="maxApplicants">Max applicants</FieldLabel>
          <Input
            id="maxApplicants"
            type="number"
            min={1}
            value={values.maxApplicants}
            onChange={(event) =>
              setValues((current) => ({ ...current, maxApplicants: event.target.value }))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="closesAt">Closes at</FieldLabel>
          <Input
            id="closesAt"
            type="date"
            value={values.closesAt}
            onChange={(event) => setValues((current) => ({ ...current, closesAt: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel>Status</FieldLabel>
          <Select
            value={values.status}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                status: value as (typeof JOB_POSTING_STATUSES)[number],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {JOB_POSTING_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Stages</FieldLabel>
          <div className="flex flex-col gap-2">
            {stages.map((stage, index) => (
              <div key={stage.id ?? `stage-${index}`} className="flex items-center gap-2">
                <Input
                  value={stage.name}
                  placeholder="Stage name"
                  onChange={(event) =>
                    setStages((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                />
                <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <Checkbox
                    checked={stage.isTerminal}
                    onCheckedChange={(checked) =>
                      setStages((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, isTerminal: checked === true } : item,
                        ),
                      )
                    }
                  />
                  Terminal
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setStages((current) => [...current, { name: '', isTerminal: false }])}
            >
              Add stage
            </Button>
          </div>
        </Field>
        {formError ? <FieldError>{formError}</FieldError> : null}
      </FieldGroup>
      <Button type="submit" disabled={submitting} className="w-fit">
        {submitting ? <Spinner data-icon="inline-start" /> : null}
        {submitLabel}
      </Button>
    </form>
  )
}
