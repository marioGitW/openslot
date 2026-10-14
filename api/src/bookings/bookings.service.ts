import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { BookingResponse, toBookingResponse } from './booking.mapper';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

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
