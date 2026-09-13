import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { ScoreBuckets } from '@/features/performance/components/score-buckets'
import {
  useCycles,
  useEmployeeReviews,
  useTeamDistribution,
} from '@/features/performance/hooks/use-performance'
import { PERMISSIONS } from '@/lib/permissions'

export function TeamDashboardPage() {
  const { data: me } = useAuth()
  const isHr = useHasPermission(PERMISSIONS.PERFORMANCE_CYCLES_WRITE)
  const { data: cycles, isPending: cyclesPending } = useCycles()
  const [cycleId, setCycleId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [reportId, setReportId] = useState('')
  const { data: directory } = useEmployees({ page: 1, pageSize: 100, status: 'ACTIVE' })
  const selectedCycleId = cycleId || cycles?.[0]?.id || ''
  const effectiveManagerId = isHr ? managerId || undefined : undefined
  const { data: team, isPending, isError } = useTeamDistribution(
    selectedCycleId,
    effectiveManagerId,
    Boolean(selectedCycleId),
  )
  const reports = useMemo(() => {
    const manager = isHr ? managerId || me?.employee.id : me?.employee.id
    return (directory?.data ?? []).filter((item) => item.managerId === manager)
  }, [directory?.data, isHr, managerId, me?.employee.id])
  const selectedReport = reportId || reports[0]?.id || ''
  const { data: reviews } = useEmployeeReviews(selectedReport, Boolean(selectedReport))

  if (cyclesPending) {
    return <Loader />
  }

  if (!cycles || cycles.length === 0) {
    return <EmptyState title="No review cycles" description="Open a cycle before viewing team scores." />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Select
          value={selectedCycleId}
          onValueChange={(value) => {
            setCycleId(value)
            setReportId('')
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {cycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.name} ({cycle.status})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {isHr ? (
          <Select
            value={managerId || 'self'}
            onValueChange={(value) => {
              setManagerId(value === 'self' ? '' : value)
              setReportId('')
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="self">My team</SelectItem>
                {(directory?.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.fullName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {isPending ? (
        <Loader />
      ) : isError || !team ? (
        <EmptyState title="Could not load team distribution" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Members</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{team.memberCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completed</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{team.completedCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average score</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{team.averageScore ?? '—'}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>PROMOTION {team.recommendations.PROMOTION}</p>
                <p>DEVELOPMENT {team.recommendations.DEVELOPMENT}</p>
                <p>PIP {team.recommendations.PIP}</p>
              </CardContent>
            </Card>
          </div>
          <ScoreBuckets buckets={team.buckets} />
        </>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Direct reports</h2>
        {reports.length === 0 ? (
          <EmptyState title="No direct reports in this directory page" />
        ) : (
          <>
            <Select value={selectedReport} onValueChange={setReportId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {reports.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.fullName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {!reviews || reviews.length === 0 ? (
              <EmptyState title="No reviews for this employee" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Review</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <Link
                          to={`/performance/reviews/${review.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {review.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{review.status}</Badge>
                      </TableCell>
                      <TableCell>{review.finalScore ?? '—'}</TableCell>
                      <TableCell>{review.recommendation ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </section>
    </div>
  )
}
