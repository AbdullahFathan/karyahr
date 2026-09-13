import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartments } from '@/features/organization/hooks/use-organization'
import { HeatmapGrid } from '@/features/performance/components/heatmap-grid'
import { useCycles, useDepartmentHeatmap } from '@/features/performance/hooks/use-performance'

export function HeatmapPage() {
  const { data: cycles, isPending: cyclesPending } = useCycles()
  const { data: departments } = useDepartments()
  const [cycleId, setCycleId] = useState('')
  const selectedCycleId = cycleId || cycles?.[0]?.id || ''
  const { data, isPending, isError } = useDepartmentHeatmap(selectedCycleId, Boolean(selectedCycleId))
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))

  if (cyclesPending) {
    return <Loader />
  }

  if (!cycles || cycles.length === 0) {
    return <EmptyState title="No review cycles" />
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={selectedCycleId} onValueChange={setCycleId}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Cycle" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.status})
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isPending ? (
        <Loader />
      ) : isError || !data ? (
        <EmptyState title="Could not load heatmap" />
      ) : data.cells.length === 0 ? (
        <EmptyState title="No department scores for this cycle" />
      ) : (
        <HeatmapGrid cells={data.cells} departmentName={departmentName} />
      )}
    </div>
  )
}
