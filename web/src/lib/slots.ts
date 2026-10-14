import type { Slot } from './types'

/** Start times offered to the host: 08:00–20:00 in 15-minute steps. */
export const START_TIMES: string[] = Array.from({ length: (20 - 8) * 4 + 1 }, (_, i) => {
  const minutes = 8 * 60 + i * 15
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
})

/** First existing slot that overlaps [startsAt, endsAt); touching edges are fine. */
export function findOverlap(slots: Slot[], startsAt: string, endsAt: string): Slot | undefined {
  const start = Date.parse(startsAt)
  const end = Date.parse(endsAt)
  return slots.find(
    (slot) => start < Date.parse(slot.endsAt) && end > Date.parse(slot.startsAt),
  )
}
