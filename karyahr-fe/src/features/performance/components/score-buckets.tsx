import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ScoreBucket } from '@/features/performance/types'

type ScoreBucketsProps = {
  readonly buckets: readonly ScoreBucket[]
}

export function ScoreBuckets({ buckets }: ScoreBucketsProps) {
  const max = Math.max(1, ...buckets.map((item) => item.count))

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {buckets.map((bucket) => (
        <Card key={bucket.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{bucket.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{bucket.count}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round((bucket.count / max) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
