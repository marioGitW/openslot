import { Skeleton } from '@/components/ui/skeleton'
import type { Slot } from '@/lib/types'

interface HostSummaryProps {
  slots: Slot[] | undefined
}

function summarize(slots: Slot[]): string {
  if (slots.length === 0) return 'You have no upcoming slots.'
  const booked = slots.filter((slot) => slot.status === 'booked').length
  const noun = slots.length === 1 ? 'upcoming slot is' : 'upcoming slots are'
  return `${booked} of ${slots.length} ${noun} booked.`
}

export function HostSummary({ slots }: HostSummaryProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Your office hours</h1>
      {slots ? (
        <p className="text-muted-foreground tabular-nums">{summarize(slots)}</p>
      ) : (
        <Skeleton className="h-5 w-56" />
      )}
    </div>
  )
}
