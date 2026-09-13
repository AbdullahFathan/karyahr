import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { JobForm } from '@/features/recruitment/components/job-form'
import { useCreateJob } from '@/features/recruitment/hooks/use-recruitment'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'
import { getApiErrorMessage } from '@/lib/api-error'
import { FieldError } from '@/components/ui/field'
import { useState } from 'react'

export function JobCreatePage() {
  const navigate = useNavigate()
  const { data: departments, isPending: departmentsPending } = useDepartments()
  const { data: positions, isPending: positionsPending } = usePositions()
  const createMutation = useCreateJob()
  const [error, setError] = useState<string | null>(null)

  if (departmentsPending || positionsPending) {
    return <Loader />
  }

  if (!departments || !positions) {
    return <EmptyState title="Could not load organization data" />
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FieldError>{error}</FieldError> : null}
      <JobForm
        departments={departments}
        positions={positions}
        submitting={createMutation.isPending}
        submitLabel="Create job"
        onSubmit={(input) => {
          setError(null)
          createMutation.mutate(input, {
            onSuccess: (job) => void navigate(`/recruitment/jobs/${job.id}`),
            onError: (cause) => setError(getApiErrorMessage(cause)),
          })
        }}
      />
    </div>
  )
}
