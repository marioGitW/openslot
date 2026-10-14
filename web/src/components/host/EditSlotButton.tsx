import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dayKeyOf, formatDayShort, formatTimeRange } from '@/lib/time'
import type { Slot } from '@/lib/types'

interface EditSlotButtonProps {
  slot: Slot
  onEdit: (slot: Slot) => void
}

export function EditSlotButton({ slot, onEdit }: EditSlotButtonProps) {
  const when = `${formatDayShort(dayKeyOf(slot.startsAt))}, ${formatTimeRange(slot)}`
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Edit slot ${when}`}
      className="text-muted-foreground hover:text-foreground"
      onClick={() => onEdit(slot)}
    >
      <Pencil aria-hidden />
    </Button>
  )
}
