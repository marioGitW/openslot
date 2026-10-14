import { Lock } from 'lucide-react'
import { slotRowClass, slotRowHeight, slotTimeClass } from '@/components/slots/slotRowStyles'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { focusRing } from '@/lib/styles'
import { formatTimeRange } from '@/lib/time'
import type { Slot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DeleteSlotButton } from './DeleteSlotButton'
import { ExpandableNote } from './ExpandableNote'

const LOCKED_HINT = "Booked slots can't be deleted."

export function HostSlotRow({ slot }: { slot: Slot }) {
  const range = formatTimeRange(slot)
  const details = (
    <p className="text-sm">
      {slot.topic}
      <span className="text-muted-foreground"> · {slot.durationMin} min</span>
    </p>
  )

  if (!slot.booking) {
    return (
      <li className={cn(slotRowClass, slotRowHeight(slot.durationMin))}>
        <div className="min-w-0 space-y-1">
          <p className={slotTimeClass}>{range}</p>
          {details}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-sm text-muted-foreground">Open</span>
          <DeleteSlotButton slot={slot} />
        </div>
      </li>
    )
  }

  const { booking } = slot
  return (
    <li
      className={cn(
        'relative overflow-hidden rounded-md border bg-muted py-3 pr-2 pl-7',
        slotRowHeight(slot.durationMin),
      )}
    >
      {/* Hatching only in a 12px edge strip, never behind text. */}
      <div aria-hidden className="hatch absolute inset-y-0 left-0 w-3 border-r" />
      {/* Status sits beside the time so the booker details get the full width. */}
      <div className="flex items-start justify-between gap-2">
        <p className={cn(slotTimeClass, 'pt-0.5')}>{range}</p>
        <div className="-my-1.5 flex shrink-0 items-center gap-1">
          <span className="text-sm text-muted-foreground">Booked</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={LOCKED_HINT}
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-md text-muted-foreground',
                  focusRing,
                )}
              >
                <Lock className="size-4" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>{LOCKED_HINT}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="min-w-0 space-y-1 pr-2">
        {details}
        <p className="flex flex-wrap gap-x-2 pt-1 text-sm">
          <span className="font-medium">{booking.name}</span>
          {/* Wraps as a whole, and only breaks inside when it can't fit a line. */}
          <a
            href={`mailto:${booking.email}`}
            className={cn(
              'min-w-0 rounded-sm text-link [overflow-wrap:anywhere] hover:underline',
              focusRing,
            )}
          >
            {booking.email}
          </a>
        </p>
        {booking.note && <ExpandableNote note={booking.note} />}
      </div>
    </li>
  )
}
