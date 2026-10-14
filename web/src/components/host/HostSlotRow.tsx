import { CalendarX, Lock } from 'lucide-react'
import { slotRowClass, slotRowHeight, slotTimeClass } from '@/components/slots/slotRowStyles'
import { TimelineItem } from '@/components/slots/TimelineItem'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { focusRing } from '@/lib/styles'
import { formatBusyRange, formatTimeRange } from '@/lib/time'
import type { BusyTime, Slot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DeleteSlotButton } from './DeleteSlotButton'
import { EditSlotButton } from './EditSlotButton'
import { ExpandableNote } from './ExpandableNote'
import { GoogleCalendarLink } from './GoogleCalendarLink'

const LOCKED_HINT = "Booked slots can't be deleted."

// The gap lives inside the row so the timeline line reaches the next dot.
const ROW_GAP = 'pb-3 last:pb-0'

function CalendarConflict({ busy }: { busy: BusyTime }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
      <Badge variant="destructive" className="text-destructive-text">
        <CalendarX aria-hidden />
        Calendar conflict
      </Badge>
      <p className="text-sm text-muted-foreground tabular-nums">
        Busy {formatBusyRange(busy.start, busy.end)} in Google Calendar
      </p>
      <GoogleCalendarLink at={busy.start} />
    </div>
  )
}

interface HostSlotRowProps {
  slot: Slot
  onEdit: (slot: Slot) => void
}

export function HostSlotRow({ slot, onEdit }: HostSlotRowProps) {
  const range = formatTimeRange(slot)
  const details = (
    <p className="text-sm">
      {slot.topic}
      <span className="text-muted-foreground"> · {slot.durationMin} min</span>
    </p>
  )
  const conflict = slot.calendarConflict && <CalendarConflict busy={slot.calendarConflict} />

  if (!slot.booking) {
    return (
      <TimelineItem dot={conflict ? 'conflict' : 'open'} className={ROW_GAP}>
        <div className={cn(slotRowClass, slotRowHeight(slot.durationMin))}>
          <div className="min-w-0 space-y-1">
            <p className={slotTimeClass}>{range}</p>
            {details}
            {conflict}
          </div>
          <div className="-my-1.5 flex shrink-0 items-center gap-1">
            <span className="text-sm text-muted-foreground">Open</span>
            <EditSlotButton slot={slot} onEdit={onEdit} />
            <DeleteSlotButton slot={slot} />
          </div>
        </div>
      </TimelineItem>
    )
  }

  const { booking } = slot
  return (
    <TimelineItem dot="booked" className={ROW_GAP}>
      <div
        className={cn(
          'relative overflow-hidden rounded-md border bg-muted py-3 pr-2 pl-7',
          slotRowHeight(slot.durationMin),
        )}
      >
        {/* Hatching only in a 12px edge strip, never behind text. */}
        <div aria-hidden className="hatch absolute inset-y-0 left-0 w-3 border-r" />
        {/* Status sits beside the time so the booker details get the full width. */}
        <div className="flex items-start justify-between gap-2">
          <p className={slotTimeClass}>{range}</p>
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
        <div className="mt-1 min-w-0 space-y-1 pr-2">
          {details}
          {conflict}
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
      </div>
    </TimelineItem>
  )
}
