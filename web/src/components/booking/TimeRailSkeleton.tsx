import { Skeleton } from '@/components/ui/skeleton'

const HEIGHTS = ['h-18', 'h-26', 'h-14']

export function TimeRailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading times" className="space-y-3 pl-6">
      {HEIGHTS.map((height, i) => (
        <Skeleton key={i} className={`${height} w-full rounded-md`} />
      ))}
    </div>
  )
}
