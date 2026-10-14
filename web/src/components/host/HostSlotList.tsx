import { formatDayLong, groupSlotsByDay } from '@/lib/time'
import type { Slot } from '@/lib/types'
import { HostSlotRow } from './HostSlotRow'

export function HostSlotList({ slots }: { slots: Slot[] }) {
  const days = [...groupSlotsByDay(slots)]

  return (
    <div className="space-y-8">
      {days.map(([day, daySlots]) => (
        <section key={day} aria-labelledby={`day-${day}`} className="space-y-3">
          <h2 id={`day-${day}`} className="text-base font-semibold tracking-tight">
            {formatDayLong(day)}
          </h2>
          <ul className="space-y-3">
            {daySlots.map((slot) => (
              <HostSlotRow key={slot.id} slot={slot} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
