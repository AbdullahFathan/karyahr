import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePublicCareer } from '@/features/recruitment/hooks/use-recruitment'
import { toDateInputValue } from '@/lib/dates'

export function CareerDetailPage() {
  const { slug = '' } = useParams()
  const { data: job, isPending, isError, error } = usePublicCareer(slug)

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} notFoundTitle="Role not found" />
  }
  if (!job) {
    return <EmptyState title="Role not found" />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{job.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap gap-3 text-muted-foreground">
            <Badge variant="secondary">{job.status}</Badge>
            <span>Closes {job.closesAt ? toDateInputValue(job.closesAt) : '—'}</span>
          </div>
          <p className="whitespace-pre-wrap">{job.description}</p>
          <p className="whitespace-pre-wrap">{job.qualifications}</p>
          <Button asChild className="w-fit">
            <Link to={`/careers/${job.slug}/apply`}>Apply</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
