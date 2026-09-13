import { type FormEvent, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  KeyResultsEditor,
  draftsFromKeyResults,
  parseKeyResultDrafts,
  type KeyResultDraft,
} from '@/features/performance/components/key-results-editor'
import {
  useGoal,
  useGoalAction,
  useUpdateGoal,
  useUpdateGoalProgress,
} from '@/features/performance/hooks/use-performance'
import { updateProgressSchema } from '@/features/performance/schema'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function GoalDetailPage() {
  const { id = '' } = useParams()
  const canWrite = useHasPermission(PERMISSIONS.PERFORMANCE_GOALS_WRITE)
  const canMe = useHasPermission(PERMISSIONS.PERFORMANCE_GOALS_ME)
  const canApprove = useHasPermission(PERMISSIONS.PERFORMANCE_GOALS_APPROVE)
  const { data: goal, isPending, isError } = useGoal(id)
  const updateMutation = useUpdateGoal(id)
  const progressMutation = useUpdateGoalProgress(id)
  const actionMutation = useGoalAction(id)
  const [formError, setFormError] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<KeyResultDraft[] | null>(null)

  if (isPending) {
    return <Loader />
  }

  if (isError || !goal) {
    return <EmptyState title="Goal not found" />
  }

  const canMutate = canWrite || canMe
  const titleValue = title ?? goal.title
  const descriptionValue = description ?? goal.description
  const krDrafts = drafts ?? draftsFromKeyResults(goal.keyResults)

  function handleProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const keyResults = parseKeyResultDrafts(krDrafts)
    const parsed = updateProgressSchema.safeParse({ keyResults })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Key results are invalid.')
      return
    }
    progressMutation.mutate(parsed.data.keyResults)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{goal.status}</Badge>
          <Badge variant="outline">{goal.level}</Badge>
          <p className="text-sm text-muted-foreground">Progress {goal.progressPercent}%</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canMutate && goal.status === 'DRAFT' ? (
            <Button type="button" onClick={() => actionMutation.mutate('submit')}>
              Submit
            </Button>
          ) : null}
          {canApprove && goal.status === 'PENDING_APPROVAL' ? (
            <>
              <Button type="button" onClick={() => actionMutation.mutate('approve')}>
                Approve
              </Button>
              <Button type="button" variant="outline" onClick={() => actionMutation.mutate('reject')}>
                Reject
              </Button>
            </>
          ) : null}
          {canMutate && goal.status === 'ACTIVE' ? (
            <>
              <Button type="button" onClick={() => actionMutation.mutate('complete')}>
                Complete
              </Button>
              <Button type="button" variant="outline" onClick={() => actionMutation.mutate('cancel')}>
                Cancel
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {canMutate && (goal.status === 'DRAFT' || canWrite) ? (
        <form
          className="flex max-w-xl flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            updateMutation.mutate({ title: titleValue, description: descriptionValue })
          }}
        >
          <Field>
            <FieldLabel htmlFor="goal-title">Title</FieldLabel>
            <Input id="goal-title" value={titleValue} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-desc">Description</FieldLabel>
            <Textarea
              id="goal-desc"
              value={descriptionValue}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={updateMutation.isPending}>
            Save details
          </Button>
        </form>
      ) : (
        <div className="max-w-xl">
          <h2 className="font-heading text-lg font-semibold">{goal.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{goal.description}</p>
        </div>
      )}
      {canMutate && goal.status === 'ACTIVE' ? (
        <form onSubmit={handleProgress} className="flex max-w-2xl flex-col gap-3">
          <h3 className="font-medium">Update key results</h3>
          <KeyResultsEditor drafts={krDrafts} onChange={setDrafts} />
          {formError ? <FieldError>{formError}</FieldError> : null}
          <Button type="submit" disabled={progressMutation.isPending}>
            Save progress
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Key results</h3>
          {goal.keyResults.length === 0 ? (
            <EmptyState title="No key results" />
          ) : (
            goal.keyResults.map((item) => (
              <p key={item.id} className="text-sm">
                {item.title} — {item.currentValue}/{item.targetValue} ({item.weight}%)
              </p>
            ))
          )}
        </div>
      )}
    </div>
  )
}
