export type SlotStatus = 'available' | 'booked'
export type SlotStatusFilter = 'available' | 'all'

export interface SlotBooking {
  id: string
  name: string
  email: string
  note: string | null
  /** Host prep agenda written by Gemini; empty until generated */
  aiAgenda: string[]
  createdAt: string
}

/** A busy time from the host's Google Calendar. */
export interface BusyTime {
  /** UTC ISO string */
  start: string
  /** UTC ISO string */
  end: string
}

export interface Slot {
  id: string
  topic: string
  /** UTC ISO string */
  startsAt: string
  /** UTC ISO string, computed by the API */
  endsAt: string
  durationMin: number
  status: SlotStatus
  /** Only present for `status=all` and booked slots */
  booking?: SlotBooking
  /** Only present for `status=all`: the first Google Calendar busy time it overlaps */
  calendarConflict?: BusyTime | null
}

export interface CalendarStatus {
  /** The API has Google Calendar credentials */
  enabled: boolean
  /** The last check against Google succeeded */
  ok: boolean
}

export interface Booking {
  id: string
  name: string
  email: string
  note: string | null
  createdAt: string
  slot: Slot
}

/** Confirmation text for the booker, from Gemini or the API's template. */
export interface AiMessage {
  message: string
  /** Host prep agenda; empty for the fallback */
  agenda: string[]
  source: 'ai' | 'fallback'
}

export interface CreateSlotInput {
  topic: string
  /** Full UTC ISO string ending in `Z` */
  startsAt: string
  /** 5–240 in steps of 5 */
  durationMin: number
}

export interface CreateBookingInput {
  name: string
  email: string
  note?: string
  /** The slot's time as the booker saw it; the API refuses if the host changed it. */
  startsAt?: string
  durationMin?: number
}
