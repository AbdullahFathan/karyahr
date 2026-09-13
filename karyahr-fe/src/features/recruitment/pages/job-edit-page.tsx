import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { FieldError } from '@/components/ui/field'
import { JobForm } from '@/features/recruitment/components/job-form'
import { useJob, useUpdateJob } from '@/features/recruitment/hooks/use-recruitment'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'
import { getApiErrorMessage } from '@/lib/api-error'

export function JobEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: job, isPending, isError } = useJob(id)
  const { data: departments, isPending: departmentsPending } = useDepartments()
  const { data: positions, isPending: positionsPending } = usePositions()
  const updateMutation = useUpdateJob(id)
  const [error, setError] = useState<string | null>(null)

  if (isPending || departmentsPending || positionsPending) {
    return <Loader />
  }

  if (isError || !job || !departments || !positions) {
    return <EmptyState title="Could not load job" />
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FieldError>{error}</FieldError> : null}
      <JobForm
        key={job.id}
        departments={departments}
        positions={positions}
        initial={job}
        submitting={updateMutation.isPending}
        submitLabel="Save job"
        onSubmit={(input) => {
          setError(null)
          updateMutation.mutate(input, {
            onSuccess: () => void navigate(`/recruitment/jobs/${job.id}`),
            onError: (cause) => setError(getApiErrorMessage(cause)),
          })
        }}
      />
    </div>
  )
}
