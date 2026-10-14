import { slotRowClass, slotRowHeight, slotTimeClass } from '@/components/slots/slotRowStyles'
import { focusRing } from '@/lib/styles'
import { formatTimeRange } from '@/lib/time'
import type { Slot } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SlotRowProps {
  slot: Slot
  selected: boolean
  onSelect: (slot: Slot) => void
}

export function SlotRow({ slot, selected, onSelect }: SlotRowProps) {
  const range = formatTimeRange(slot)

  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      aria-pressed={selected}
      aria-label={`${range}, ${slot.topic}, ${slot.durationMin} minutes`}
      className={cn(
        slotRowClass,
        slotRowHeight(slot.durationMin),
        focusRing,
        'transition-colors hover:bg-accent',
        selected && 'bg-accent ring-2 ring-ring',
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className={slotTimeClass}>{range}</span>
        <span className="truncate text-sm">
          {slot.topic}
          <span className="text-muted-foreground"> · {slot.durationMin} min</span>
        </span>
      </span>
      {/* Looks like a ghost button; the whole row is the actual button. */}
      <span
        aria-hidden
        className="hidden h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium text-link md:inline-flex"
      >
        Book
      </span>
    </button>
  )
}
