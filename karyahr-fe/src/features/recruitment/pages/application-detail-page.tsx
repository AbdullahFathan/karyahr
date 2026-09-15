import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { HireCandidateDialog } from '@/features/recruitment/components/hire-candidate-dialog'
import {
  useAddApplicationNote,
  useApplication,
  useHireApplication,
  useJob,
  useMoveApplicationStage,
  useRejectApplication,
} from '@/features/recruitment/hooks/use-recruitment'
import { applicationNoteFormSchema } from '@/features/recruitment/schema'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { getApiErrorMessage } from '@/lib/api-error'

export function ApplicationDetailPage() {
  const { id = '' } = useParams()
  const canWrite = useHasPermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_WRITE)
  const canHire = useHasPermission(PERMISSIONS.RECRUITMENT_HIRE)
  const { data: application, isPending, isError, error } = useApplication(id)
  const { data: job } = useJob(application?.jobPostingId ?? '')
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 }, canHire)
  const addNote = useAddApplicationNote(id)
  const moveStage = useMoveApplicationStage(id)
  const reject = useRejectApplication(id)
  const hire = useHireApplication(id)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [noteBody, setNoteBody] = useState('')
  const [rating, setRating] = useState('')
  const [stageId, setStageId] = useState<string | undefined>()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [hireOpen, setHireOpen] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [hiredEmployeeId, setHiredEmployeeId] = useState<string | null>(null)

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} notFoundTitle="Application not found" />
  }
  if (!application) {
    return <EmptyState title="Application not found" />
  }

  const isActive = application.status === 'ACTIVE'
  const selectedStage = stageId ?? application.stageId

  function handleNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNoteError(null)
    const parsed = applicationNoteFormSchema.safeParse({ body: noteBody, rating })
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? 'Enter a note.')
      return
    }
    addNote.mutate(
      {
        body: parsed.data.body,
        rating: parsed.data.rating === '' ? null : parsed.data.rating,
      },
      {
        onSuccess: () => {
          setNoteBody('')
          setRating('')
        },
        onError: (cause) => setNoteError(getApiErrorMessage(cause)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">{application.candidate.fullName}</h2>
          <p className="text-sm text-muted-foreground">{application.candidate.email}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/recruitment/jobs/${application.jobPostingId}`}>Back to job</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Candidate</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Phone {application.candidate.phone}</p>
          <p>National ID {application.candidate.nationalId ?? '—'}</p>
          <p>
            Status <Badge variant="secondary">{application.status}</Badge>
          </p>
          <p>
            Stage <Badge variant="outline">{application.stage.name}</Badge>
          </p>
          {application.employeeId ? (
            <p>
              Employee{' '}
              <Link className="underline-offset-4 hover:underline" to={`/employees/${application.employeeId}`}>
                {application.employeeId}
              </Link>
            </p>
          ) : null}
          {application.attachments.length > 0 ? (
            <p className="sm:col-span-2">
              Resume {application.attachments.map((item) => item.fileName).join(', ')}
            </p>
          ) : null}
        </CardContent>
      </Card>
      {actionError ? <FieldError>{actionError}</FieldError> : null}
      {canWrite && isActive ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field className="min-w-56">
            <FieldLabel>Move stage</FieldLabel>
            <Select value={selectedStage} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(job?.stages ?? [application.stage]).map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={moveStage.isPending || selectedStage === application.stageId}
            onClick={() =>
              moveStage.mutate(selectedStage, {
                onError: (cause) => setActionError(getApiErrorMessage(cause)),
              })
            }
          >
            Move
          </Button>
          <Button type="button" variant="destructive" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
          {canHire ? (
            <Button type="button" onClick={() => setHireOpen(true)}>
              Hire
            </Button>
          ) : null}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {application.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {application.notes.map((note) => (
                <li key={note.id} className="rounded-md border p-3 text-sm">
                  <p>{note.body}</p>
                  <p className="mt-1 text-muted-foreground">
                    Rating {note.rating ?? '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {canWrite && isActive ? (
            <form onSubmit={handleNote} className="flex flex-col gap-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="note">Note</FieldLabel>
                  <Textarea id="note" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="rating">Rating (optional)</FieldLabel>
                  <Input
                    id="rating"
                    type="number"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                  />
                </Field>
                {noteError ? <FieldError>{noteError}</FieldError> : null}
              </FieldGroup>
              <Button type="submit" className="w-fit" disabled={addNote.isPending}>
                Add note
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>Sets status to REJECTED. This cannot be undone from the UI.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                reject.mutate(undefined, {
                  onSuccess: () => setRejectOpen(false),
                  onError: (cause) => setActionError(getApiErrorMessage(cause)),
                })
              }
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {hireOpen ? (
        <HireCandidateDialog
          open={hireOpen}
          submitting={hire.isPending}
          candidateName={application.candidate.fullName}
          defaultNationalId={application.candidate.nationalId}
          defaultPhone={application.candidate.phone}
          managers={employees?.data ?? []}
          temporaryPassword={temporaryPassword}
          employeeId={hiredEmployeeId}
          onOpenChange={(open) => {
            setHireOpen(open)
            if (!open) {
              setTemporaryPassword(null)
              setHiredEmployeeId(null)
            }
          }}
          onSubmit={(input) => {
            setActionError(null)
            hire.mutate(input, {
              onSuccess: (result) => {
                setTemporaryPassword(result.temporaryPassword)
                setHiredEmployeeId(result.employeeId)
              },
              onError: (cause) => setActionError(getApiErrorMessage(cause)),
            })
          }}
        />
      ) : null}
    </div>
  )
}
