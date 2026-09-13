import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { GoalFormDialog } from '@/features/performance/components/goal-form-dialog'
import { useCreateGoal, useMyGoals, useMyReviews } from '@/features/performance/hooks/use-performance'
import { PERMISSIONS } from '@/lib/permissions'

export function MyPerformancePage() {
  const { data: me } = useAuth()
  const canCreate = useHasPermission(PERMISSIONS.PERFORMANCE_GOALS_ME)
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const createMutation = useCreateGoal()
  const { data: goals, isPending: goalsPending, isError: goalsError } = useMyGoals({ page, pageSize: 20 })
  const { data: reviews, isPending: reviewsPending } = useMyReviews()

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">My goals</h2>
          {canCreate ? (
            <Button type="button" onClick={() => setDialogOpen(true)}>
              Create goal
            </Button>
          ) : null}
        </div>
        {goalsPending ? (
          <Loader />
        ) : goalsError ? (
          <EmptyState title="Could not load goals" />
        ) : !goals || goals.data.length === 0 ? (
          <EmptyState title="No goals" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.data.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <Link
                        to={`/performance/goals/${goal.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {goal.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{goal.status}</Badge>
                    </TableCell>
                    <TableCell>{goal.progressPercent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {goals.meta.page} of {goals.meta.totalPages || 1}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= (goals.meta.totalPages || 1)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold">My reviews</h2>
        {reviewsPending ? (
          <Loader />
        ) : !reviews || reviews.length === 0 ? (
          <EmptyState title="No reviews" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader>
                  <CardTitle>
                    <Link to={`/performance/reviews/${review.id}`} className="underline-offset-4 hover:underline">
                      Review {review.id.slice(0, 8)}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>
                    Status <Badge variant="secondary">{review.status}</Badge>
                  </p>
                  <p>Score {review.finalScore ?? '—'}</p>
                  <p>{review.recommendation ?? 'No recommendation yet'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      <GoalFormDialog
        key={String(dialogOpen)}
        open={dialogOpen}
        submitting={createMutation.isPending}
        lockedLevel="EMPLOYEE"
        lockedEmployeeId={me?.employee.id}
        onOpenChange={setDialogOpen}
        onSubmit={(input) => {
          createMutation.mutate(input, { onSuccess: () => setDialogOpen(false) })
        }}
      />
    </div>
  )
}
