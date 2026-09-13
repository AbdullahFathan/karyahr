import { type FormEvent, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { useEmployee, useEmployees } from '@/features/employees/hooks/use-employees'
import {
  useAssignReviewPeers,
  useCompleteReview,
  useCycle,
  useReview,
  useSubmitReviewRating,
} from '@/features/performance/hooks/use-performance'
import { submitRatingSchema } from '@/features/performance/schema'
import type { PerformanceRaterType } from '@/features/performance/types'
import { formatDateTime } from '@/lib/dates'
import { PERMISSIONS } from '@/lib/permissions'

export function ReviewPage() {
  const { id = '' } = useParams()
  const { data: me } = useAuth()
  const canWrite = useHasPermission(PERMISSIONS.PERFORMANCE_REVIEWS_WRITE)
  const canReadEmployees = useHasPermission(PERMISSIONS.EMPLOYEES_READ)
  const { data: review, isPending, isError } = useReview(id)
  const { data: cycle } = useCycle(review?.cycleId ?? '', Boolean(review?.cycleId))
  const { data: subject } = useEmployee(canReadEmployees ? (review?.employeeId ?? '') : '')
  const { data: employees } = useEmployees(
    { page: 1, pageSize: 100, status: 'ACTIVE' },
    canWrite || canReadEmployees,
  )
  const assignPeers = useAssignReviewPeers(id)
  const submitRating = useSubmitReviewRating(id)
  const completeMutation = useCompleteReview(id)
  const [peerIds, setPeerIds] = useState<string[]>([])
  const [raterType, setRaterType] = useState<PerformanceRaterType>('SELF')
  const [score, setScore] = useState('5')
  const [comment, setComment] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const employeeName = new Map((employees?.data ?? []).map((item) => [item.id, item.fullName]))

  const allowedRaterTypes = useMemo(() => {
    if (!review || !me) {
      return [] as PerformanceRaterType[]
    }
    const types: PerformanceRaterType[] = []
    if (review.employeeId === me.employee.id) {
      types.push('SELF')
    }
    if (subject?.managerId === me.employee.id) {
      types.push('MANAGER')
    }
    if (review.peers.some((peer) => peer.peerEmployeeId === me.employee.id)) {
      types.push('PEER')
    }
    return types
  }, [me, review, subject?.managerId])

  const alreadyRated = Boolean(me && review?.ratings.some((item) => item.raterEmployeeId === me.employee.id))
  const hasSelf = Boolean(review?.ratings.some((item) => item.raterType === 'SELF'))
  const hasManager = Boolean(review?.ratings.some((item) => item.raterType === 'MANAGER'))
  const cycleOpen = cycle?.status === 'OPEN'
  const canAssign = canWrite && cycleOpen && review?.status !== 'COMPLETED'
  const canRate = !alreadyRated && cycleOpen && review?.status !== 'COMPLETED' && allowedRaterTypes.length > 0
  const canComplete = canWrite && review?.status !== 'COMPLETED' && hasSelf && hasManager

  if (isPending) {
    return <Loader />
  }

  if (isError || !review) {
    return <EmptyState title="Review not found" />
  }

  function handleRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = submitRatingSchema.safeParse({ raterType, score, comment })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check rating fields.')
      return
    }
    submitRating.mutate(parsed.data)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{review.status}</Badge>
          {cycle ? <Badge variant="outline">{cycle.status}</Badge> : null}
          {review.recommendation ? <Badge>{review.recommendation}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Subject{' '}
          {review.employeeId === me?.employee.id
            ? me.employee.fullName
            : (subject?.fullName ?? review.employeeId)}
          {review.finalScore !== null ? ` · Score ${review.finalScore}` : ''}
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Peers</h2>
        {review.peers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No peers assigned.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {review.peers.map((peer) => (
              <li key={peer.id}>{employeeName.get(peer.peerEmployeeId) ?? peer.peerEmployeeId}</li>
            ))}
          </ul>
        )}
        {canAssign ? (
          <div className="flex max-w-xl flex-col gap-2">
            <p className="text-sm">Assign peers</p>
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border p-3">
              {(employees?.data ?? [])
                .filter((item) => item.id !== review.employeeId)
                .map((item) => {
                  const checked = peerIds.includes(item.id)
                  return (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          if (value === true) {
                            setPeerIds([...peerIds, item.id])
                            return
                          }
                          setPeerIds(peerIds.filter((idValue) => idValue !== item.id))
                        }}
                      />
                      {item.fullName}
                    </label>
                  )
                })}
            </div>
            <Button
              type="button"
              disabled={assignPeers.isPending || peerIds.length === 0}
              onClick={() => assignPeers.mutate(peerIds)}
            >
              Save peers
            </Button>
          </div>
        ) : null}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Ratings</h2>
        {review.ratings.length === 0 ? (
          <EmptyState title="No ratings yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rater</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {review.ratings.map((rating) => (
                <TableRow key={rating.id}>
                  <TableCell>{employeeName.get(rating.raterEmployeeId) ?? rating.raterEmployeeId}</TableCell>
                  <TableCell>{rating.raterType}</TableCell>
                  <TableCell>{rating.score}</TableCell>
                  <TableCell>{rating.comment}</TableCell>
                  <TableCell>{formatDateTime(rating.submittedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {canRate ? (
          <form onSubmit={handleRating} className="flex max-w-md flex-col gap-3">
            <Field>
              <FieldLabel>Rater type</FieldLabel>
              <Select value={raterType} onValueChange={(value) => setRaterType(value as PerformanceRaterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {allowedRaterTypes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Score</FieldLabel>
              <Select value={score} onValueChange={setScore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[1, 2, 3, 4, 5].map((item) => (
                      <SelectItem key={item} value={String(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="rating-comment">Comment</FieldLabel>
              <Textarea
                id="rating-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </Field>
            {formError ? <FieldError>{formError}</FieldError> : null}
            <Button type="submit" disabled={submitRating.isPending}>
              Submit rating
            </Button>
          </form>
        ) : null}
      </section>
      {canComplete ? (
        <Button type="button" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
          Complete review
        </Button>
      ) : null}
    </div>
  )
}
