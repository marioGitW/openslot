import { dayKeyOf } from './time'
import type { Slot } from './types'

// Mirrors api/src/slots/slot-duration.ts.
export const MIN_DURATION_MIN = 5
export const MAX_DURATION_MIN = 240
export const DURATION_STEP_MIN = 5
export const DURATION_MESSAGE = 'Duration must be 5–240 minutes in steps of 5.'

/** One-click durations in the host form; anything else goes through "Custom". */
export const DURATION_PRESETS = ['15', '30', '45', '60'] as const
export const CUSTOM_DURATION = 'custom'

export function isValidDuration(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_DURATION_MIN &&
    minutes <= MAX_DURATION_MIN &&
    minutes % DURATION_STEP_MIN === 0
  )
}

/** Minutes for the chosen preset or custom value, or null if the custom value is invalid. */
export function resolveDuration(choice: string, custom: string): number | null {
  const minutes = choice === CUSTOM_DURATION ? Number(custom.trim() || NaN) : Number(choice)
  return isValidDuration(minutes) ? minutes : null
}

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

export type HostStatusFilter = 'all' | 'open' | 'booked'

/** Host view filter: an inclusive Skopje day range (both null = all upcoming) and a status. */
export interface HostFilter {
  from: string | null
  to: string | null
  status: HostStatusFilter
}

export function isFiltered(filter: HostFilter): boolean {
  return filter.from !== null || filter.status !== 'all'
}

export function filterSlots(slots: Slot[], filter: HostFilter): Slot[] {
  return slots.filter((slot) => {
    if (filter.status === 'open' && slot.status !== 'available') return false
    if (filter.status === 'booked' && slot.status !== 'booked') return false
    if (filter.from && filter.to) {
      // Day keys compare correctly as strings.
      const day = dayKeyOf(slot.startsAt)
      if (day < filter.from || day > filter.to) return false
    }
    return true
  })
}
