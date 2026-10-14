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
    <ol
      aria-label={label}
      className="relative pl-5 before:absolute before:top-2 before:bottom-5 before:left-1.5 before:w-px before:bg-border"
    >
      {slots.map((slot) => {
        const leaving = slot.id === leavingSlotId
        return (
          <li
            key={slot.id}
            aria-hidden={leaving || undefined}
            className={cn(
              // The only animation on the page; the global reduced-motion rule
              // makes it instant.
              'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
              leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
            )}
          >
            <div className="min-h-0 overflow-hidden p-0.5 pb-3">
              <SlotRow
                slot={slot}
                selected={slot.id === selectedSlotId}
                onSelect={onSelect}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
