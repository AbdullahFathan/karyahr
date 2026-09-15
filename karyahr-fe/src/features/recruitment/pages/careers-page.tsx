import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePublicCareers } from '@/features/recruitment/hooks/use-recruitment'
import { toDateInputValue } from '@/lib/dates'

export function CareersPage() {
  const { data, isPending, isError, error } = usePublicCareers()

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} />
  }

  const jobs = data ?? []

  if (jobs.length === 0) {
    return <EmptyState title="No open roles" description="There are no public openings right now." />
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold">Careers</h1>
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardHeader>
            <CardTitle>
              <Link to={`/careers/${job.slug}`} className="underline-offset-4 hover:underline">
                {job.title}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">{job.status}</Badge>
            <span>Headcount {job.headcount}</span>
            <span>Closes {job.closesAt ? toDateInputValue(job.closesAt) : '—'}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
