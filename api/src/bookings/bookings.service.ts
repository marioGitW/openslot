import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiService, BookingTexts } from '../ai/ai.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { Booking } from '../generated/prisma/client.js';
import { isPrismaError } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { slotEndsAt, slotInterval } from '../slots/slot.mapper.js';
import { BookingResponse, toBookingResponse } from './booking.mapper.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

function storedAiMessage(booking: Booking): BookingTexts {
  return {
    message: booking.aiMessage ?? '',
    agenda: booking.aiAgenda,
    source: 'ai',
  };
}

@Injectable()
export class BookingsService {
  private readonly aiInFlight = new Map<string, Promise<BookingTexts>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
    private readonly ai: AiService,
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

  /**
   * The Gemini confirmation and host agenda, generated at most once: a success is
   * stored and returned from then on; a fallback isn't stored, so a later call can
   * still succeed. Concurrent calls for one booking share a single request.
   */
  generateAiMessage(id: string): Promise<BookingTexts> {
    const pending = this.aiInFlight.get(id);
    if (pending) return pending;
    const promise = this.loadOrGenerateAiMessage(id).finally(() =>
      this.aiInFlight.delete(id),
    );
    this.aiInFlight.set(id, promise);
    return promise;
  }

  private async loadOrGenerateAiMessage(id: string): Promise<BookingTexts> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    if (booking.aiGeneratedAt) {
      return storedAiMessage(booking);
    }

    const texts = await this.ai.generateBookingTexts({
      bookingId: booking.id,
      firstName: booking.name.split(/\s+/)[0],
      topic: booking.slot.topic,
      startsAt: booking.slot.startsAt,
      endsAt: slotEndsAt(booking.slot),
      note: booking.note,
    });
    if (texts.source !== 'ai') {
      return texts;
    }

    // First write wins if another instance generated text at the same time.
    const { count } = await this.prisma.booking.updateMany({
      where: { id, aiGeneratedAt: null },
      data: {
        aiMessage: texts.message,
        aiAgenda: texts.agenda,
        aiGeneratedAt: new Date(),
      },
    });
    if (count === 0) {
      const stored = await this.prisma.booking.findUnique({ where: { id } });
      if (stored?.aiGeneratedAt) return storedAiMessage(stored);
    }
    return texts;
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
