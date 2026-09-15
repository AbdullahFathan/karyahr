import { type FormEvent, useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useAddOnboardingTemplateItem,
  useCreateOnboardingTemplate,
  useDeleteOnboardingTemplateItem,
  useOnboardingTemplates,
} from '@/features/onboarding/hooks/use-onboarding'
import { onboardingItemFormSchema, onboardingTemplateFormSchema } from '@/features/onboarding/schema'
import { ONBOARDING_ASSIGNEE_KINDS } from '@/features/onboarding/types'
import { usePositions } from '@/features/organization/hooks/use-organization'
import { getApiErrorMessage } from '@/lib/api-error'

export function OnboardingTemplatesPage() {
  const { data: templates, isPending, isError, error } = useOnboardingTemplates()
  const { data: positions } = usePositions()
  const createTemplate = useCreateOnboardingTemplate()
  const addItem = useAddOnboardingTemplateItem()
  const deleteItem = useDeleteOnboardingTemplateItem()
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [positionId, setPositionId] = useState('none')
  const [itemDrafts, setItemDrafts] = useState<
    Record<string, { title: string; description: string; assigneeKind: string; sortOrder: string }>
  >({})
  const positionName = new Map((positions ?? []).map((item) => [item.id, item.name]))

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} />
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = onboardingTemplateFormSchema.safeParse({
      name,
      positionId: positionId === 'none' ? null : positionId,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Enter a template name.')
      return
    }
    createTemplate.mutate(parsed.data, {
      onSuccess: () => {
        setName('')
        setPositionId('none')
      },
      onError: (cause) => setFormError(getApiErrorMessage(cause)),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex max-w-xl flex-col gap-3">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="templateName">New template</FieldLabel>
            <Input id="templateName" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Position (optional)</FieldLabel>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">All positions</SelectItem>
                  {(positions ?? []).map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {formError ? <FieldError>{formError}</FieldError> : null}
        </FieldGroup>
        <Button type="submit" className="w-fit" disabled={createTemplate.isPending}>
          Create template
        </Button>
      </form>
      {(templates ?? []).length === 0 ? (
        <EmptyState title="No templates" />
      ) : (
        (templates ?? []).map((template) => {
          const draft = itemDrafts[template.id] ?? {
            title: '',
            description: '',
            assigneeKind: 'HR',
            sortOrder: String(template.items.length),
          }
          return (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {template.positionId
                    ? (positionName.get(template.positionId) ?? template.positionId)
                    : 'All positions'}
                </p>
                {template.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {template.items.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <Badge variant="secondary">{item.assigneeKind}</Badge>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => deleteItem.mutate(item.id)}
                        >
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  className="grid gap-2 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const parsed = onboardingItemFormSchema.safeParse({
                      title: draft.title,
                      description: draft.description,
                      assigneeKind: draft.assigneeKind,
                      sortOrder: Number(draft.sortOrder),
                    })
                    if (!parsed.success) {
                      setFormError(parsed.error.issues[0]?.message ?? 'Fill the item fields.')
                      return
                    }
                    addItem.mutate(
                      { templateId: template.id, input: parsed.data },
                      {
                        onSuccess: () =>
                          setItemDrafts((current) => ({
                            ...current,
                            [template.id]: {
                              title: '',
                              description: '',
                              assigneeKind: 'HR',
                              sortOrder: String(template.items.length + 1),
                            },
                          })),
                        onError: (cause) => setFormError(getApiErrorMessage(cause)),
                      },
                    )
                  }}
                >
                  <Input
                    placeholder="Item title"
                    value={draft.title}
                    onChange={(event) =>
                      setItemDrafts((current) => ({
                        ...current,
                        [template.id]: { ...draft, title: event.target.value },
                      }))
                    }
                  />
                  <Select
                    value={draft.assigneeKind}
                    onValueChange={(value) =>
                      setItemDrafts((current) => ({
                        ...current,
                        [template.id]: { ...draft, assigneeKind: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ONBOARDING_ASSIGNEE_KINDS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {kind}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Textarea
                    className="sm:col-span-2"
                    placeholder="Description"
                    value={draft.description}
                    onChange={(event) =>
                      setItemDrafts((current) => ({
                        ...current,
                        [template.id]: { ...draft, description: event.target.value },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    value={draft.sortOrder}
                    onChange={(event) =>
                      setItemDrafts((current) => ({
                        ...current,
                        [template.id]: { ...draft, sortOrder: event.target.value },
                      }))
                    }
                  />
                  <Button type="submit" disabled={addItem.isPending}>
                    Add item
                  </Button>
                </form>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
