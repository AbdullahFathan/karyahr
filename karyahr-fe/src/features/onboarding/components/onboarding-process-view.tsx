import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { useCompleteOnboardingTask } from '@/features/onboarding/hooks/use-onboarding'
import type { OnboardingProcess } from '@/features/onboarding/types'
import { formatDateTime } from '@/lib/dates'
import { getApiErrorMessage } from '@/lib/api-error'
import { FieldError } from '@/components/ui/field'
import { useState } from 'react'

type OnboardingProcessViewProps = {
  readonly process: OnboardingProcess
  readonly canComplete: boolean
}

export function OnboardingProcessView({ process, canComplete }: OnboardingProcessViewProps) {
  const complete = useCompleteOnboardingTask()
  const [error, setError] = useState<string | null>(null)
  const tasks = [...process.tasks].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{process.status}</Badge>
        <p className="text-sm text-muted-foreground">
          {tasks.filter((task) => task.completedAt).length}/{tasks.length} complete
        </p>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      {tasks.length === 0 ? (
        <EmptyState title="No onboarding tasks" />
      ) : (
        tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-base">{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>{task.description}</p>
              <p className="text-muted-foreground">
                {task.assigneeKind}
                {task.completedAt ? ` · ${formatDateTime(task.completedAt)}` : ''}
              </p>
              {canComplete && !task.completedAt ? (
                <Button
                  type="button"
                  className="w-fit"
                  disabled={complete.isPending}
                  onClick={() =>
                    complete.mutate(task.id, {
                      onError: (cause) => setError(getApiErrorMessage(cause)),
                    })
                  }
                >
                  Complete task
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
