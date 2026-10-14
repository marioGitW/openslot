export const SLOT_DURATIONS = [15, 30, 45, 60] as const
export type SlotDuration = (typeof SLOT_DURATIONS)[number]

export type SlotStatus = 'available' | 'booked'
export type SlotStatusFilter = 'available' | 'all'

export interface SlotBooking {
  id: string
  name: string
  email: string
  note: string | null
  createdAt: string
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
}

export interface Booking {
  id: string
  name: string
  email: string
  note: string | null
  createdAt: string
  slot: Slot
}

export interface CreateSlotInput {
  topic: string
  /** Full UTC ISO string ending in `Z` */
  startsAt: string
  durationMin: SlotDuration
}

export interface CreateBookingInput {
  name: string
  email: string
  note?: string
}
