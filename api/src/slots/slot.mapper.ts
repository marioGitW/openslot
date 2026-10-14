import { Interval } from '../common/intervals';
import { Booking, Slot } from '../generated/prisma/client';

export interface SlotBookingResponse {
  id: string;
  name: string;
  email: string;
  note: string | null;
  createdAt: Date;
}

export interface SlotResponse {
  id: string;
  topic: string;
  startsAt: Date;
  endsAt: Date;
  durationMin: number;
  status: 'available' | 'booked';
  booking?: SlotBookingResponse;
  /** Only for `status=all`: the first Google Calendar busy time it overlaps. */
  calendarConflict?: Interval | null;
}

export function slotEndsAt(slot: Pick<Slot, 'startsAt' | 'durationMin'>): Date {
  return new Date(slot.startsAt.getTime() + slot.durationMin * 60_000);
}

export function slotInterval(
  slot: Pick<Slot, 'startsAt' | 'durationMin'>,
): Interval {
  return { start: slot.startsAt, end: slotEndsAt(slot) };
}

/**
 * Maps a Prisma slot to the API shape. `booked` sets the status when the booking
 * row wasn't loaded; booking details are only exposed with `includeBooking`.
 */
export function toSlotResponse(
  slot: Slot & { booking?: Booking | null },
  options: { booked?: boolean; includeBooking?: boolean } = {},
): SlotResponse {
  const booked = options.booked ?? Boolean(slot.booking);
  const response: SlotResponse = {
    id: slot.id,
    topic: slot.topic,
    startsAt: slot.startsAt,
    endsAt: slotEndsAt(slot),
    durationMin: slot.durationMin,
    status: booked ? 'booked' : 'available',
  };
  if (options.includeBooking && slot.booking) {
    const { id, name, email, note, createdAt } = slot.booking;
    response.booking = { id, name, email, note, createdAt };
  }
  return response;
}
