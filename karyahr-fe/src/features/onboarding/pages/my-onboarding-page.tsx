import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { OnboardingProcessView } from '@/features/onboarding/components/onboarding-process-view'
import { useMyOnboardingProcess } from '@/features/onboarding/hooks/use-onboarding'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function MyOnboardingPage() {
  const canComplete = useHasPermission(PERMISSIONS.ONBOARDING_TASKS_COMPLETE)
  const { data, isPending, isError } = useMyOnboardingProcess()

  if (isPending) {
    return <Loader />
  }

  if (isError || !data) {
    return <EmptyState title="No onboarding process" description="HR has not started onboarding for your profile." />
  }

  return <OnboardingProcessView process={data} canComplete={canComplete} />
}
