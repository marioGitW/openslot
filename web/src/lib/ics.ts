import { host } from '@/config/host'
import type { Booking } from './types'

// 2026-10-16T12:30:00.000Z → 20261016T123000Z
function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// RFC 5545: lines longer than 75 characters continue on a line starting with a space.
function fold(line: string): string {
  const parts: string[] = []
  for (let i = 0; i < line.length; i += 73) parts.push(line.slice(i, i + 73))
  return parts.join('\r\n ')
}

export function buildIcs(booking: Booking): string {
  const { slot } = booking
  const description = booking.note
    ? `Office hours with ${host.name}. Your note: ${booking.note}`
    : `Office hours with ${host.name}.`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenSlot//Office hours//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@openslot`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(slot.startsAt)}`,
    `DTEND:${icsDate(slot.endsAt)}`,
    `SUMMARY:${escapeText(`${slot.topic} with ${host.name}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(booking: Booking): void {
  const blob = new Blob([buildIcs(booking)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'openslot-booking.ics'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
