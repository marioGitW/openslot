import { Skeleton } from '@/components/ui/skeleton'

export function HostSlotListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading slots" className="space-y-8">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="space-y-3 pl-6">
            <Skeleton className="h-18 w-full rounded-md" />
            <Skeleton className="h-26 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}
