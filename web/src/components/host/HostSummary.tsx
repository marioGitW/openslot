import { Skeleton } from '@/components/ui/skeleton'
import { filterSlots, isFiltered, type HostFilter } from '@/lib/slots'
import { formatRangePhrase } from '@/lib/time'
import type { Slot } from '@/lib/types'

interface HostSummaryProps {
  slots: Slot[] | undefined
  filter: HostFilter
}

function summarize(slots: Slot[], filter: HostFilter): string {
  if (!isFiltered(filter)) {
    if (slots.length === 0) return 'You have no upcoming slots.'
    const booked = slots.filter((slot) => slot.status === 'booked').length
    const noun = slots.length === 1 ? 'upcoming slot is' : 'upcoming slots are'
    return `${booked} of ${slots.length} ${noun} booked.`
  }

  const visible = filterSlots(slots, filter)
  const when = filter.from && filter.to ? ` ${formatRangePhrase(filter.from, filter.to)}` : ''
  // Without a date range the filter still covers all upcoming slots.
  const noun = (count: number) => `${when ? '' : 'upcoming '}${count === 1 ? 'slot' : 'slots'}`
  const status = filter.status === 'all' ? '' : `${filter.status} `

  if (visible.length === 0) return `No ${status}${noun(0)}${when}.`
  if (filter.status === 'all') {
    const booked = visible.filter((slot) => slot.status === 'booked').length
    return `${booked} of ${visible.length} ${noun(visible.length)} booked${when}.`
  }
  return `${visible.length} ${status}${noun(visible.length)}${when}.`
}

export function HostSummary({ slots, filter }: HostSummaryProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Your office hours</h1>
      {slots ? (
        <p aria-live="polite" className="text-muted-foreground tabular-nums">
          {summarize(slots, filter)}
        </p>
      ) : (
        <Skeleton className="h-5 w-56" />
      )}
    </div>
  )
}
