import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useJobs } from '@/features/recruitment/hooks/use-recruitment'
import { JOB_POSTING_STATUSES, type JobPostingStatus } from '@/features/recruitment/types'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'

export function JobsPage() {
  const canWrite = useHasPermission(PERMISSIONS.RECRUITMENT_JOBS_WRITE)
  const [status, setStatus] = useState<JobPostingStatus | undefined>()
  const [page, setPage] = useState(1)
  const { data, isPending, isError } = useJobs({ status, page, pageSize: 20 })
  const { data: departments } = useDepartments()
  const { data: positions } = usePositions()
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const positionName = new Map((positions ?? []).map((item) => [item.id, item.name]))

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <EmptyState title="Could not load jobs" />
  }

  const jobs = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select
          value={status ?? 'all'}
          onValueChange={(value) => {
            setStatus(value === 'all' ? undefined : (value as JobPostingStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              {JOB_POSTING_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {canWrite ? (
          <Button asChild>
            <Link to="/recruitment/jobs/new">Create job</Link>
          </Button>
        ) : null}
      </div>
      {jobs.length === 0 ? (
        <EmptyState title="No jobs" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Headcount</TableHead>
                <TableHead>Max applicants</TableHead>
                <TableHead>Closes at</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link to={`/recruitment/jobs/${job.id}`} className="font-medium underline-offset-4 hover:underline">
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell>{job.slug}</TableCell>
                  <TableCell>{departmentName.get(job.departmentId) ?? job.departmentId}</TableCell>
                  <TableCell>{positionName.get(job.positionId) ?? job.positionId}</TableCell>
                  <TableCell>{job.headcount}</TableCell>
                  <TableCell>{job.maxApplicants}</TableCell>
                  <TableCell>{job.closesAt ? toDateInputValue(job.closesAt) : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{job.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {data?.meta.page} of {data?.meta.totalPages || 1}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (data?.meta.totalPages || 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
