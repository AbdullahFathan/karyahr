import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { OnboardingProcessView } from '@/features/onboarding/components/onboarding-process-view'
import { useOnboardingProcess } from '@/features/onboarding/hooks/use-onboarding'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function OnboardingProcessPage() {
  const { employeeId = '' } = useParams()
  const canComplete = useHasPermission(PERMISSIONS.ONBOARDING_TASKS_COMPLETE)
  const { data, isPending, isError } = useOnboardingProcess(employeeId)

  if (isPending) {
    return <Loader />
  }

  if (isError || !data) {
    return <EmptyState title="Onboarding process not found" />
  }

  return <OnboardingProcessView process={data} canComplete={canComplete} />
}
