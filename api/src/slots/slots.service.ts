import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarService } from '../calendar/calendar.service';
import { findOverlap, Interval } from '../common/intervals';
import { formatSkopjeRange } from '../common/time-zone';
import { Slot } from '../generated/prisma/client';
import { isPrismaError } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { SlotListStatus } from './dto/list-slots-query.dto';
import { MAX_DURATION_MIN } from './slot-duration';
import {
  SlotResponse,
  slotEndsAt,
  slotInterval,
  toSlotResponse,
} from './slot.mapper';

const MAX_DURATION_MS = MAX_DURATION_MIN * 60_000;

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
  ) {}

  async create(dto: CreateSlotDto): Promise<SlotResponse> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = slotEndsAt({ startsAt, durationMin: dto.durationMin });

    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Slot start time must be in the future.');
    }

    // A slot overlapping [startsAt, endsAt) starts before endsAt and at most one
    // max duration before startsAt; the exact check runs in code.
    const candidates = await this.prisma.slot.findMany({
      where: {
        startsAt: {
          gte: new Date(startsAt.getTime() - MAX_DURATION_MS),
          lt: endsAt,
        },
      },
    });
    const overlap = findOverlap(candidates.map(slotInterval), {
      start: startsAt,
      end: endsAt,
    });
    if (overlap) {
      throw new ConflictException('This time overlaps another slot.');
    }

    const busy = await this.calendar.findConflict(startsAt, endsAt);
    if (busy) {
      throw new ConflictException(
        `This overlaps an event in your Google Calendar (${formatSkopjeRange(busy.start, busy.end)}).`,
      );
    }

    const slot = await this.prisma.slot.create({
      data: { topic: dto.topic, startsAt, durationMin: dto.durationMin },
    });
    return toSlotResponse(slot, { booked: false });
  }

  async list(status: SlotListStatus): Promise<SlotResponse[]> {
    const now = new Date();
    if (status === 'available') {
      const slots = await this.prisma.slot.findMany({
        where: { startsAt: { gt: now }, booking: null },
        orderBy: { startsAt: 'asc' },
      });
      const busy = await this.busyTimesFor(slots);
      return slots
        .filter((slot) => !findOverlap(busy, slotInterval(slot)))
        .map((slot) => toSlotResponse(slot, { booked: false }));
    }

    const slots = await this.prisma.slot.findMany({
      where: { startsAt: { gt: now } },
      include: { booking: true },
      orderBy: { startsAt: 'asc' },
    });
    const busy = await this.busyTimesFor(slots);
    return slots.map((slot) => ({
      ...toSlotResponse(slot, { includeBooking: true }),
      calendarConflict: findOverlap(busy, slotInterval(slot)) ?? null,
    }));
  }

  /**
   * Busy times for the days covering all the slots (sorted by start). Empty when
   * the calendar is off or the check failed, so every slot stays listed.
   */
  private async busyTimesFor(slots: Slot[]): Promise<Interval[]> {
    if (slots.length === 0) return [];
    const end = Math.max(...slots.map((slot) => slotEndsAt(slot).getTime()));
    const { busy } = await this.calendar.getBusyIntervalsForDays(
      slots[0].startsAt,
      new Date(end),
    );
    return busy;
  }

  async remove(id: string): Promise<void> {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!slot) {
      throw new NotFoundException('Slot not found.');
    }
    if (slot.booking) {
      throw new ConflictException("A booked slot can't be deleted.");
    }

    try {
      await this.prisma.slot.delete({ where: { id } });
    } catch (error) {
      // A booking created after the check above trips the FK restrict.
      if (isPrismaError(error, 'P2003')) {
        throw new ConflictException("A booked slot can't be deleted.");
      }
      throw error;
    }
  }
}
