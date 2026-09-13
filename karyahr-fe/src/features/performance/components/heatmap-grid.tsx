import { cn } from '@/lib/utils'
import type { HeatmapCell } from '@/features/performance/types'

type HeatmapGridProps = {
  readonly cells: readonly HeatmapCell[]
  readonly departmentName: ReadonlyMap<string, string>
}

function cellTone(averageScore: number | null): string {
  if (averageScore === null) {
    return 'bg-muted text-muted-foreground'
  }
  if (averageScore >= 4) {
    return 'bg-primary text-primary-foreground'
  }
  if (averageScore >= 3) {
    return 'bg-primary/70 text-primary-foreground'
  }
  if (averageScore >= 2) {
    return 'bg-primary/40'
  }
  return 'bg-primary/15'
}

export function HeatmapGrid({ cells, departmentName }: HeatmapGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cells.map((cell) => (
        <div key={cell.departmentId} className={cn('rounded-lg p-4', cellTone(cell.averageScore))}>
          <p className="font-medium">{departmentName.get(cell.departmentId) ?? cell.departmentId}</p>
          <p className="mt-1 text-sm">
            {cell.averageScore === null ? 'No completed scores' : `Avg ${cell.averageScore}`}
          </p>
          <p className="text-sm opacity-80">{cell.count} reviews</p>
        </div>
      ))}
    </div>
  )
}
