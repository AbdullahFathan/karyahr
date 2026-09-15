import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { ListPagination } from '@/components/common/list-pagination'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
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
import { Can } from '@/features/auth/components/can'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'

export function JobsPage() {
  const [status, setStatus] = useState<JobPostingStatus | undefined>()
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error } = useJobs({ status, page, pageSize: 20 })
  const { data: departments } = useDepartments()
  const { data: positions } = usePositions()
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const positionName = new Map((positions ?? []).map((item) => [item.id, item.name]))

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} />
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
        <Can permission={PERMISSIONS.RECRUITMENT_JOBS_WRITE}>
          <Button asChild>
            <Link to="/recruitment/jobs/new">Create job</Link>
          </Button>
        </Can>
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
          <ListPagination page={page} totalPages={data?.meta.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
