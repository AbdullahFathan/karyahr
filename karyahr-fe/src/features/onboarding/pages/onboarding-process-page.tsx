import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { OnboardingProcessView } from '@/features/onboarding/components/onboarding-process-view'
import { useOnboardingProcess } from '@/features/onboarding/hooks/use-onboarding'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function OnboardingProcessPage() {
  const { employeeId = '' } = useParams()
  const canComplete = useHasPermission(PERMISSIONS.ONBOARDING_TASKS_COMPLETE)
  const { data, isPending, isError, error } = useOnboardingProcess(employeeId)

  if (isPending) {
    return <Loader />
  }

  if (isError) {
    return <QueryErrorState error={error} notFoundTitle="Onboarding process not found" />
  }
  if (!data) {
    return <EmptyState title="Onboarding process not found" />
  }

  return <OnboardingProcessView process={data} canComplete={canComplete} />
}
