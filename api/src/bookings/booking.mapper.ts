import { Booking, Slot } from '../generated/prisma/client';
import { SlotResponse, toSlotResponse } from '../slots/slot.mapper';

export interface BookingResponse {
  id: string;
  name: string;
  email: string;
  note: string | null;
  createdAt: Date;
  slot: SlotResponse;
}

export function toBookingResponse(
  booking: Booking & { slot: Slot },
): BookingResponse {
  return {
    id: booking.id,
    name: booking.name,
    email: booking.email,
    note: booking.note,
    createdAt: booking.createdAt,
    slot: toSlotResponse(booking.slot, { booked: true }),
  };
}
