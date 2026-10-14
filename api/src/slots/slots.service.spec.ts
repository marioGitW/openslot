import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CalendarService } from '../calendar/calendar.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAX_DURATION_MIN } from './slot-duration.js';
import { SlotsService } from './slots.service.js';

// Mocks return plain test objects, so async mocks are typed loosely.
type AsyncFn = (...args: unknown[]) => Promise<unknown>;
type SlotData = { topic: string; startsAt: Date; durationMin: number };

const MINUTE = 60_000;

describe('SlotsService overlap rule', () => {
  let service: SlotsService;
  const prisma = {
    slot: {
      findMany: jest.fn<AsyncFn>(),
      create: jest.fn<(args: { data: SlotData }) => Promise<unknown>>(),
      findUnique: jest.fn<AsyncFn>(),
      updateMany: jest.fn<AsyncFn>(),
    },
  };
  const calendar = {
    findConflict: jest.fn<AsyncFn>(),
    getBusyIntervalsForDays: jest.fn<AsyncFn>(),
  };

  // Existing slot: tomorrow 10:00–10:30 (relative to now).
  const existingStart = new Date(Date.now() + 24 * 60 * MINUTE);
  existingStart.setSeconds(0, 0);
  const existing = {
    id: 'existing',
    topic: 'Existing',
    startsAt: existingStart,
    durationMin: 30,
    createdAt: new Date(),
  };
  const at = (offsetMin: number) =>
    new Date(existingStart.getTime() + offsetMin * MINUTE).toISOString();

  beforeEach(async () => {
    jest.resetAllMocks();
    calendar.findConflict.mockResolvedValue(null);
    calendar.getBusyIntervalsForDays.mockResolvedValue({ ok: true, busy: [] });
    prisma.slot.findMany.mockResolvedValue([existing]);
    prisma.slot.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'new', createdAt: new Date(), ...data }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        SlotsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendar },
      ],
    }).compile();
    service = moduleRef.get(SlotsService);
  });

  it.each([
    ['starts inside the existing slot', 15, 30],
    ['ends inside the existing slot', -15, 30],
    ['contains the existing slot', -15, 60],
    ['has the same start', 0, 15],
  ])('rejects a slot that %s', async (_label, offsetMin, durationMin) => {
    await expect(
      service.create({ topic: 'New', startsAt: at(offsetMin), durationMin }),
    ).rejects.toThrow(
      new ConflictException('This time overlaps another slot.'),
    );
    expect(prisma.slot.create).not.toHaveBeenCalled();
  });

  it.each([
    ['starts exactly when the existing slot ends', 30, 30],
    ['ends exactly when the existing slot starts', -30, 30],
    ['is well after the existing slot', 120, 60],
  ])('allows a slot that %s', async (_label, offsetMin, durationMin) => {
    const result = await service.create({
      topic: 'New',
      startsAt: at(offsetMin),
      durationMin,
    });

    expect(result).toMatchObject({ status: 'available', durationMin });
    expect(result.endsAt.getTime() - result.startsAt.getTime()).toBe(
      durationMin * MINUTE,
    );
    expect(prisma.slot.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a slot that starts inside a long slot that began well before it', async () => {
    // Existing 120-minute slot from 08:30 to 10:30; the new one starts at 10:00.
    const long = {
      ...existing,
      id: 'long',
      startsAt: new Date(existingStart.getTime() - 90 * MINUTE),
      durationMin: 120,
    };
    prisma.slot.findMany.mockResolvedValue([long]);

    await expect(
      service.create({ topic: 'New', startsAt: at(0), durationMin: 15 }),
    ).rejects.toThrow(
      new ConflictException('This time overlaps another slot.'),
    );
    expect(prisma.slot.create).not.toHaveBeenCalled();
  });

  it('looks back the maximum slot duration for overlap candidates', async () => {
    prisma.slot.findMany.mockResolvedValue([]);

    await service.create({ topic: 'New', startsAt: at(0), durationMin: 30 });

    expect(prisma.slot.findMany).toHaveBeenCalledWith({
      where: {
        startsAt: {
          gte: new Date(existingStart.getTime() - MAX_DURATION_MIN * MINUTE),
          lt: new Date(existingStart.getTime() + 30 * MINUTE),
        },
      },
    });
  });

  it('rejects a slot in the past', async () => {
    await expect(
      service.create({
        topic: 'Past',
        startsAt: new Date(Date.now() - MINUTE).toISOString(),
        durationMin: 30,
      }),
    ).rejects.toThrow(
      new BadRequestException('Slot start time must be in the future.'),
    );
    expect(prisma.slot.findMany).not.toHaveBeenCalled();
  });

  describe('Google Calendar', () => {
    // A second open slot two hours after the existing one.
    const later = {
      ...existing,
      id: 'later',
      startsAt: new Date(existingStart.getTime() + 120 * MINUTE),
    };
    // Busy 10 minutes into the existing slot.
    const busy = {
      start: new Date(existingStart.getTime() + 10 * MINUTE),
      end: new Date(existingStart.getTime() + 40 * MINUTE),
    };

    beforeEach(() => {
      prisma.slot.findMany.mockResolvedValue([existing, later]);
    });

    it('leaves slots that clash with a busy time out of the available list', async () => {
      calendar.getBusyIntervalsForDays.mockResolvedValue({
        ok: true,
        busy: [busy],
      });

      const result = await service.list('available');

      expect(result.map((slot) => slot.id)).toEqual(['later']);
      // One query for the window covering every slot.
      expect(calendar.getBusyIntervalsForDays).toHaveBeenCalledTimes(1);
      expect(calendar.getBusyIntervalsForDays).toHaveBeenCalledWith(
        existing.startsAt,
        new Date(later.startsAt.getTime() + 30 * MINUTE),
      );
    });

    it('annotates every slot in the full list', async () => {
      calendar.getBusyIntervalsForDays.mockResolvedValue({
        ok: true,
        busy: [busy],
      });

      const result = await service.list('all');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'existing',
        calendarConflict: busy,
      });
      expect(result[1]).toMatchObject({ id: 'later', calendarConflict: null });
    });

    it('lists every slot when the calendar is off or the check failed', async () => {
      calendar.getBusyIntervalsForDays.mockResolvedValue({
        ok: false,
        busy: [],
      });

      const available = await service.list('available');
      const all = await service.list('all');

      expect(available.map((slot) => slot.id)).toEqual(['existing', 'later']);
      expect(all.map((slot) => slot.calendarConflict)).toEqual([null, null]);
    });

    it('skips the calendar when there are no slots', async () => {
      prisma.slot.findMany.mockResolvedValue([]);

      await expect(service.list('available')).resolves.toEqual([]);
      expect(calendar.getBusyIntervalsForDays).not.toHaveBeenCalled();
    });

    it('rejects a new slot that overlaps a busy time, showing it in Skopje time', async () => {
      prisma.slot.findMany.mockResolvedValue([]);
      // 2030-01-07 is in winter, so Skopje is UTC+1.
      calendar.findConflict.mockResolvedValue({
        start: new Date('2030-01-07T09:00:00Z'),
        end: new Date('2030-01-07T09:30:00Z'),
      });

      await expect(
        service.create({
          topic: 'New',
          startsAt: '2030-01-07T09:15:00Z',
          durationMin: 30,
        }),
      ).rejects.toThrow(
        new ConflictException(
          'This overlaps an event in your Google Calendar (10:00–10:30).',
        ),
      );
      expect(calendar.findConflict).toHaveBeenCalledWith(
        new Date('2030-01-07T09:15:00Z'),
        new Date('2030-01-07T09:45:00Z'),
      );
      await service
        .create({
          topic: 'New',
          startsAt: '2030-01-07T09:15:00Z',
          durationMin: 30,
        })
        .catch((error: ConflictException) => {
          expect(error.getResponse()).toMatchObject({
            code: 'CALENDAR_CONFLICT',
          });
        });
      expect(prisma.slot.create).not.toHaveBeenCalled();
    });

    it('checks the calendar only after the slot overlap rule', async () => {
      await expect(
        service.create({ topic: 'New', startsAt: at(0), durationMin: 15 }),
      ).rejects.toThrow('This time overlaps another slot.');
      expect(calendar.findConflict).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const open = {
      ...existing,
      id: 'open',
      startsAt: new Date(existingStart.getTime() + 180 * MINUTE),
      booking: null,
    };
    const input = (offsetMin: number, durationMin = 30, topic = 'Renamed') => ({
      topic,
      startsAt: at(offsetMin),
      durationMin,
    });

    beforeEach(() => {
      prisma.slot.findUnique.mockResolvedValue(open);
      prisma.slot.updateMany.mockResolvedValue({ count: 1 });
    });

    it('moves an open slot and returns the new time', async () => {
      const result = await service.update('open', input(240, 45));

      expect(result).toMatchObject({
        id: 'open',
        topic: 'Renamed',
        durationMin: 45,
        status: 'available',
      });
      expect(result.startsAt).toEqual(new Date(at(240)));
      expect(prisma.slot.updateMany).toHaveBeenCalledWith({
        where: { id: 'open', booking: null },
        data: {
          topic: 'Renamed',
          startsAt: new Date(at(240)),
          durationMin: 45,
        },
      });
    });

    it('ignores the slot itself in the overlap check', async () => {
      prisma.slot.findMany.mockResolvedValue([]);

      await service.update('open', input(190));

      expect(prisma.slot.findMany).toHaveBeenCalledWith({
        where: {
          startsAt: expect.any(Object) as unknown,
          id: { not: 'open' },
        },
      });
    });

    it('rejects a move onto another slot', async () => {
      await expect(service.update('open', input(15))).rejects.toThrow(
        'This time overlaps another slot.',
      );
      expect(prisma.slot.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a move into the past', async () => {
      await expect(
        service.update('open', {
          topic: 'Past',
          startsAt: new Date(Date.now() - MINUTE).toISOString(),
          durationMin: 30,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a move onto a Google Calendar busy time', async () => {
      calendar.findConflict.mockResolvedValue({
        start: new Date(at(240)),
        end: new Date(at(270)),
      });

      const error = await service
        .update('open', input(240))
        .catch((e: ConflictException) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'CALENDAR_CONFLICT',
      });
      expect(prisma.slot.updateMany).not.toHaveBeenCalled();
    });

    it('skips the time checks for a topic-only edit', async () => {
      calendar.findConflict.mockResolvedValue({
        start: open.startsAt,
        end: new Date(open.startsAt.getTime() + 30 * MINUTE),
      });

      await service.update('open', input(180, 30, 'New topic'));

      expect(calendar.findConflict).not.toHaveBeenCalled();
      expect(prisma.slot.findMany).not.toHaveBeenCalled();
      expect(prisma.slot.updateMany).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException for a missing slot', async () => {
      prisma.slot.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', input(240)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to edit a booked slot', async () => {
      prisma.slot.findUnique.mockResolvedValue({
        ...open,
        booking: { id: 'booking-1' },
      });

      const error = await service
        .update('open', input(240))
        .catch((e: ConflictException) => e);

      expect((error as ConflictException).getResponse()).toMatchObject({
        message: "A booked slot can't be edited.",
        code: 'SLOT_BOOKED',
      });
      expect(prisma.slot.updateMany).not.toHaveBeenCalled();
    });

    it('refuses the edit when a booking arrives during the request', async () => {
      prisma.slot.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update('open', input(240))).rejects.toThrow(
        "A booked slot can't be edited.",
      );
    });

    it('refuses to edit a slot that has already started', async () => {
      prisma.slot.findUnique.mockResolvedValue({
        ...open,
        startsAt: new Date(Date.now() - MINUTE),
      });

      await expect(service.update('open', input(240))).rejects.toThrow(
        'This slot has already started.',
      );
    });
  });
});
