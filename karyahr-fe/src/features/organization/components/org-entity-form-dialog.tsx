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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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

type Option = {
  readonly id: string
  readonly name: string
}

type OrgEntityFormDialogProps = {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly submitting: boolean
  readonly initialName?: string
  readonly initialCode?: string
  readonly initialParentId?: string | null
  readonly parentOptions: readonly Option[]
  readonly parentLabel: string
  readonly extraField?: {
    readonly label: string
    readonly value: string | null
    readonly options: readonly Option[]
    readonly onChange: (value: string | null) => void
  }
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: { name: string; code: string; parentId: string | null }) => void
}

export function OrgEntityFormDialog({
  open,
  title,
  description,
  submitting,
  initialName = '',
  initialCode = '',
  initialParentId = null,
  parentOptions,
  parentLabel,
  extraField,
  onOpenChange,
  onSubmit,
}: OrgEntityFormDialogProps) {
  const [name, setName] = useState(initialName)
  const [code, setCode] = useState(initialCode)
  const [parentId, setParentId] = useState<string | null>(initialParentId)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ name, code, parentId })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="org-name">Name</FieldLabel>
              <Input id="org-name" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="org-code">Code</FieldLabel>
              <Input id="org-code" value={code} onChange={(event) => setCode(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>{parentLabel}</FieldLabel>
              <Select
                value={parentId ?? 'none'}
                onValueChange={(value) => setParentId(value === 'none' ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">None</SelectItem>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {extraField ? (
              <Field>
                <FieldLabel>{extraField.label}</FieldLabel>
                <Select
                  value={extraField.value ?? 'none'}
                  onValueChange={(value) => extraField.onChange(value === 'none' ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">None</SelectItem>
                      {extraField.options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
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
