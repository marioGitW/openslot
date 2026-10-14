import { TZDate } from '@date-fns/tz'
import { addDays, format } from 'date-fns'
import type { Slot } from './types'

/**
 * All time-zone logic lives here. The API stores and returns UTC; everything the
 * user sees is in Skopje time. Days are passed around as `yyyy-MM-dd` keys.
 */
export const TIME_ZONE = 'Europe/Skopje'

const DAY_MS = 24 * 60 * 60 * 1000

function toSkopje(value: string | Date): TZDate {
  const ms = typeof value === 'string' ? Date.parse(value) : value.getTime()
  return new TZDate(ms, TIME_ZONE)
}

function keyParts(dayKey: string): [number, number, number] {
  const [y, m, d] = dayKey.split('-').map(Number)
  return [y, m, d]
}

// Noon avoids any DST edge when only the calendar day matters.
function keyToSkopjeDate(dayKey: string): TZDate {
  const [y, m, d] = keyParts(dayKey)
  return new TZDate(y, m - 1, d, 12, 0, TIME_ZONE)
}

/** `14:30` */
export function formatTime(iso: string): string {
  return format(toSkopje(iso), 'HH:mm')
}

/** `14:30–15:00` */
export function formatTimeRange(slot: Pick<Slot, 'startsAt' | 'endsAt'>): string {
  return `${formatTime(slot.startsAt)}–${formatTime(slot.endsAt)}`
}

/** Skopje calendar day of an instant, as `yyyy-MM-dd`. */
export function dayKeyOf(iso: string): string {
  return format(toSkopje(iso), 'yyyy-MM-dd')
}

export function todayKey(): string {
  return format(TZDate.tz(TIME_ZONE), 'yyyy-MM-dd')
}

/** Current Skopje time as `HH:mm`. */
export function nowTimeInSkopje(): string {
  return format(TZDate.tz(TIME_ZONE), 'HH:mm')
}

export function addDaysToKey(dayKey: string, days: number): string {
  return format(addDays(keyToSkopjeDate(dayKey), days), 'yyyy-MM-dd')
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetweenKeys(from: string, to: string): number {
  const [fy, fm, fd] = keyParts(from)
  const [ty, tm, td] = keyParts(to)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS)
}

/** `Thursday 16 October` */
export function formatDayLong(dayKey: string): string {
  return format(keyToSkopjeDate(dayKey), 'EEEE d MMMM')
}

/** `Thu 16 Oct` */
export function formatDayShort(dayKey: string): string {
  return format(keyToSkopjeDate(dayKey), 'EEE d MMM')
}

/** `16 Oct` */
export function formatDayMonthShort(dayKey: string): string {
  return format(keyToSkopjeDate(dayKey), 'd MMM')
}

/** `14 Oct – 20 Oct`, or `14 Oct` for a single day. */
export function formatRangeShort(from: string, to: string): string {
  if (from === to) return formatDayMonthShort(from)
  return `${formatDayMonthShort(from)} – ${formatDayMonthShort(to)}`
}

/** `between 14 and 20 October`, `between 28 October and 3 November` or `on 14 October`. */
export function formatRangePhrase(from: string, to: string): string {
  const start = keyToSkopjeDate(from)
  const end = keyToSkopjeDate(to)
  if (from === to) return `on ${format(start, 'd MMMM')}`
  if (start.getFullYear() !== end.getFullYear()) {
    return `between ${format(start, 'd MMMM yyyy')} and ${format(end, 'd MMMM yyyy')}`
  }
  if (start.getMonth() !== end.getMonth()) {
    return `between ${format(start, 'd MMMM')} and ${format(end, 'd MMMM')}`
  }
  return `between ${format(start, 'd')} and ${format(end, 'd MMMM')}`
}

/** True for a real calendar day written as `yyyy-MM-dd`. */
export function isDayKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = keyParts(value)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** The Sunday ending the Monday-first week that contains `dayKey`. */
export function endOfWeekKey(dayKey: string): string {
  const isoWeekday = Number(format(keyToSkopjeDate(dayKey), 'i'))
  return addDaysToKey(dayKey, 7 - isoWeekday)
}

/** `Thursday` */
export function weekdayLong(dayKey: string): string {
  return format(keyToSkopjeDate(dayKey), 'EEEE')
}

/** `Thu` */
export function weekdayShort(dayKey: string): string {
  return format(keyToSkopjeDate(dayKey), 'EEE')
}

/** `16` */
export function dayOfMonth(dayKey: string): string {
  return format(keyToSkopjeDate(dayKey), 'd')
}

/** Groups slots (already sorted by start) by Skopje day, keeping order. */
export function groupSlotsByDay(slots: Slot[]): Map<string, Slot[]> {
  const groups = new Map<string, Slot[]>()
  for (const slot of slots) {
    const key = dayKeyOf(slot.startsAt)
    const group = groups.get(key)
    if (group) group.push(slot)
    else groups.set(key, [slot])
  }
  return groups
}

/**
 * A Skopje day + `HH:mm` → UTC ISO string ending in `Z`, as the API expects.
 * (TZDate's own toISOString keeps the +01:00/+02:00 offset.)
 */
export function skopjeToUtcIso(dayKey: string, time: string): string {
  const [y, m, d] = keyParts(dayKey)
  const [h, min] = time.split(':').map(Number)
  const local = new TZDate(y, m - 1, d, h, min, TIME_ZONE)
  return new Date(local.getTime()).toISOString()
}

/** Adds minutes to a UTC ISO string. */
export function addMinutesIso(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString()
}

/**
 * The calendar picker works with plain local dates; these map them to and from
 * day keys without any time-zone conversion.
 */
export function keyToPickerDate(dayKey: string): Date {
  const [y, m, d] = keyParts(dayKey)
  return new Date(y, m - 1, d)
}

export function pickerDateToKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
