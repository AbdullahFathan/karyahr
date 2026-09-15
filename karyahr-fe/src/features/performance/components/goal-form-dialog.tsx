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
import { Textarea } from '@/components/ui/textarea'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useDepartments } from '@/features/organization/hooks/use-organization'
import { KeyResultsEditor } from '@/features/performance/components/key-results-editor'
import {
  emptyKeyResultDraft,
  parseKeyResultDrafts,
  type KeyResultDraft,
} from '@/features/performance/components/key-results'
import { createGoalSchema, type CreateGoalFormInput } from '@/features/performance/schema'
import { GOAL_LEVELS, type GoalLevel } from '@/features/performance/types'

type GoalFormDialogProps = {
  readonly open: boolean
  readonly submitting: boolean
  readonly lockedLevel?: GoalLevel
  readonly lockedEmployeeId?: string
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (input: CreateGoalFormInput) => void
}

export function GoalFormDialog({
  open,
  submitting,
  lockedLevel,
  lockedEmployeeId,
  onOpenChange,
  onSubmit,
}: GoalFormDialogProps) {
  const { data: departments } = useDepartments(!lockedLevel || lockedLevel === 'DEPARTMENT')
  const needEmployeePicker = !lockedEmployeeId
  const { data: employees } = useEmployees(
    { page: 1, pageSize: 100, status: 'ACTIVE' },
    needEmployeePicker,
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<GoalLevel>(lockedLevel ?? 'EMPLOYEE')
  const [departmentId, setDepartmentId] = useState('')
  const [employeeId, setEmployeeId] = useState(lockedEmployeeId ?? '')
  const [parentGoalId, setParentGoalId] = useState('')
  const [drafts, setDrafts] = useState<KeyResultDraft[]>([emptyKeyResultDraft()])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const keyResults = parseKeyResultDrafts(drafts)
    const parsed = createGoalSchema.safeParse({
      level: lockedLevel ?? level,
      title,
      description,
      parentGoalId: parentGoalId || null,
      departmentId: (lockedLevel ?? level) === 'DEPARTMENT' ? departmentId || null : null,
      employeeId:
        (lockedLevel ?? level) === 'EMPLOYEE' ? lockedEmployeeId || employeeId || null : null,
      keyResults: keyResults.length > 0 ? keyResults : undefined,
    })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the goal fields.')
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create goal</DialogTitle>
          <DialogDescription>Title, description, level, and optional key results.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="goal-title">Title</FieldLabel>
              <Input id="goal-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-desc">Description</FieldLabel>
              <Textarea
                id="goal-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            {lockedLevel ? null : (
              <Field>
                <FieldLabel>Level</FieldLabel>
                <Select value={level} onValueChange={(value) => setLevel(value as GoalLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {GOAL_LEVELS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
            {(lockedLevel ?? level) === 'DEPARTMENT' ? (
              <Field>
                <FieldLabel>Department</FieldLabel>
                <Select value={departmentId || 'none'} onValueChange={(value) => setDepartmentId(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Select department</SelectItem>
                      {(departments ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {(lockedLevel ?? level) === 'EMPLOYEE' && !lockedEmployeeId ? (
              <Field>
                <FieldLabel>Employee</FieldLabel>
                <Select value={employeeId || 'none'} onValueChange={(value) => setEmployeeId(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Select employee</SelectItem>
                      {(employees?.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.fullName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="goal-parent">Parent goal ID (optional)</FieldLabel>
              <Input
                id="goal-parent"
                value={parentGoalId}
                onChange={(event) => setParentGoalId(event.target.value)}
              />
            </Field>
            <KeyResultsEditor drafts={drafts} onChange={setDrafts} />
            {formError ? <FieldError>{formError}</FieldError> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
