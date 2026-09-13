import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'

export function Loader() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading…
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
