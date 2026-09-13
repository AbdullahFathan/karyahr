import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useJob,
  useJobApplications,
  useReplaceJobStages,
} from '@/features/recruitment/hooks/use-recruitment'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { getApiErrorMessage } from '@/lib/api-error'
import { toDateInputValue } from '@/lib/dates'

export function JobDetailPage() {
  const { id = '' } = useParams()
  const canWrite = useHasPermission(PERMISSIONS.RECRUITMENT_JOBS_WRITE)
  const canReadApplications = useHasPermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_READ)
  const [page, setPage] = useState(1)
  const { data: job, isPending, isError } = useJob(id)
  const { data: applications } = useJobApplications(id, { page, pageSize: 20 })
  const { data: departments } = useDepartments()
  const { data: positions } = usePositions()
  const replaceStages = useReplaceJobStages(id)
  const [stageError, setStageError] = useState<string | null>(null)
  const [stages, setStages] = useState<
    { id?: string; name: string; isTerminal: boolean }[] | null
  >(null)

  if (isPending) {
    return <Loader />
  }

  if (isError || !job) {
    return <EmptyState title="Job not found" />
  }

  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const positionName = new Map((positions ?? []).map((item) => [item.id, item.name]))
  const editor = stages ?? job.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    isTerminal: stage.isTerminal,
  }))

  function handleSaveStages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStageError(null)
    const next = editor.filter((stage) => stage.name.trim().length > 0)
    if (next.length === 0) {
      setStageError('Keep at least one stage.')
      return
    }
    replaceStages.mutate(next, {
      onSuccess: () => setStages(null),
      onError: (cause) => setStageError(getApiErrorMessage(cause)),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">{job.title}</h2>
          <p className="text-sm text-muted-foreground">{job.slug}</p>
        </div>
        {canWrite ? (
          <Button variant="outline" asChild>
            <Link to={`/recruitment/jobs/${job.id}/edit`}>Edit job</Link>
          </Button>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Job</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Status <Badge variant="secondary">{job.status}</Badge>
          </p>
          <p>Department {departmentName.get(job.departmentId) ?? job.departmentId}</p>
          <p>Position {positionName.get(job.positionId) ?? job.positionId}</p>
          <p>Headcount {job.headcount}</p>
          <p>Max applicants {job.maxApplicants}</p>
          <p>Closes {job.closesAt ? toDateInputValue(job.closesAt) : '—'}</p>
          <p className="sm:col-span-2 whitespace-pre-wrap">{job.description}</p>
          <p className="sm:col-span-2 whitespace-pre-wrap">{job.qualifications}</p>
        </CardContent>
      </Card>
      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveStages} className="flex flex-col gap-3">
              {editor.map((stage, index) => (
                <div key={stage.id ?? `new-${index}`} className="flex items-center gap-2">
                  <Input
                    value={stage.name}
                    onChange={(event) =>
                      setStages(
                        editor.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <Checkbox
                      checked={stage.isTerminal}
                      onCheckedChange={(checked) =>
                        setStages(
                          editor.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, isTerminal: checked === true } : item,
                          ),
                        )
                      }
                    />
                    Terminal
                  </label>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStages([...editor, { name: '', isTerminal: false }])
                  }
                >
                  Add stage
                </Button>
                <Button type="submit" size="sm" disabled={replaceStages.isPending}>
                  Save stages
                </Button>
              </div>
              {stageError ? <FieldError>{stageError}</FieldError> : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
      {canReadApplications ? (
        <div className="flex flex-col gap-3">
          <h3 className="font-heading font-semibold">Applications</h3>
          {!applications || applications.data.length === 0 ? (
            <EmptyState title="No applications" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.data.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <Link
                          to={`/recruitment/applications/${application.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {application.candidate.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{application.candidate.email}</TableCell>
                      <TableCell>{application.stage.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{application.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {applications.meta.page} of {applications.meta.totalPages || 1}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= (applications.meta.totalPages || 1)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
