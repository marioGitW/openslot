import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarService } from '../calendar/calendar.service';
import { isPrismaError } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { slotInterval } from '../slots/slot.mapper';
import { BookingResponse, toBookingResponse } from './booking.mapper';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
  ) {}

  async create(
    slotId: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponse> {
    const slot = await this.prisma.slot.findUnique({ where: { id: slotId } });
    if (!slot) {
      throw new NotFoundException('Slot not found.');
    }
    if (slot.startsAt.getTime() <= Date.now()) {
      throw new ConflictException('This slot has already started.');
    }
    // The host may have edited the slot after the booker loaded the page.
    const moved =
      (dto.startsAt !== undefined &&
        new Date(dto.startsAt).getTime() !== slot.startsAt.getTime()) ||
      (dto.durationMin !== undefined && dto.durationMin !== slot.durationMin);
    if (moved) {
      throw new ConflictException('This time is no longer available.');
    }
    // The host's calendar may have changed since the slot was listed. Fails open:
    // no conflict is reported when the calendar is off or unreachable.
    const { start, end } = slotInterval(slot);
    if (await this.calendar.findConflict(start, end)) {
      throw new ConflictException('This time is no longer available.');
    }

    // No "is it booked?" pre-check: the unique constraint on Booking.slotId is the
    // only reliable guard against concurrent bookings.
    try {
      const booking = await this.prisma.booking.create({
        data: {
          slotId,
          name: dto.name,
          email: dto.email,
          note: dto.note || null,
        },
        include: { slot: true },
      });
      return toBookingResponse(booking);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('This slot has just been booked.');
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    return toBookingResponse(booking);
  }
}
