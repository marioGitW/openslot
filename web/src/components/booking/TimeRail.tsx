import { TimelineItem } from '@/components/slots/TimelineItem'
import type { Slot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SlotRow } from './SlotRow'

interface TimeRailProps {
  slots: Slot[]
  label: string
  selectedSlotId: string | null
  /** Slot that was just booked; its row collapses out. */
  leavingSlotId: string | null
  onSelect: (slot: Slot) => void
}

export function TimeRail({
  slots,
  label,
  selectedSlotId,
  leavingSlotId,
  onSelect,
}: TimeRailProps) {
  return (
    // Cards sit 2px into each row (room for the selected ring), so the dots do too.
    <ol aria-label={label} className="[--card-top:2px]">
      {slots.map((slot) => {
        const leaving = slot.id === leavingSlotId
        const selected = slot.id === selectedSlotId
        return (
          <TimelineItem
            key={slot.id}
            dot={selected ? 'selected' : 'open'}
            aria-hidden={leaving || undefined}
            className={cn(
              // The only animation on the page; the global reduced-motion rule
              // makes it instant.
              'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
              leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
            )}
          >
            <div className="min-h-0 overflow-hidden p-0.5 pb-3">
              <SlotRow slot={slot} selected={selected} onSelect={onSelect} />
            </div>
          </TimelineItem>
        )
      })}
    </ol>
  )
}
