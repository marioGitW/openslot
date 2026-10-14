import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';
import { CalendarService } from '../calendar/calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from './bookings.service';

const HOUR = 60 * 60_000;

describe('BookingsService', () => {
  let service: BookingsService;
  const prisma = {
    slot: { findUnique: jest.fn() },
    booking: { create: jest.fn(), findUnique: jest.fn() },
  };
  const calendar = { findConflict: jest.fn() };

  const dto = { name: 'Ana', email: 'ana@example.com', note: 'Hi' };
  const futureSlot = () => ({
    id: 'slot-1',
    topic: 'Office hours',
    startsAt: new Date(Date.now() + HOUR),
    durationMin: 30,
    createdAt: new Date(),
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    calendar.findConflict.mockResolvedValue(null);
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendar },
      ],
    }).compile();
    service = moduleRef.get(BookingsService);
  });

  it('creates a booking and returns it with its slot', async () => {
    const slot = futureSlot();
    prisma.slot.findUnique.mockResolvedValue(slot);
    prisma.booking.create.mockResolvedValue({
      id: 'booking-1',
      slotId: slot.id,
      ...dto,
      aiMessage: null,
      createdAt: new Date(),
      slot,
    });

    const result = await service.create(slot.id, dto);

    expect(result.id).toBe('booking-1');
    expect(result.slot).toMatchObject({ id: slot.id, status: 'booked' });
  });

  it('throws ConflictException when the unique constraint fails (P2002)', async () => {
    prisma.slot.findUnique.mockResolvedValue(futureSlot());
    prisma.booking.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const promise = service.create('slot-1', dto);

    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toThrow('This slot has just been booked.');
  });

  it('rethrows other Prisma errors', async () => {
    prisma.slot.findUnique.mockResolvedValue(futureSlot());
    const error = new Error('connection lost');
    prisma.booking.create.mockRejectedValue(error);

    await expect(service.create('slot-1', dto)).rejects.toBe(error);
  });

  it('throws NotFoundException when the slot does not exist', async () => {
    prisma.slot.findUnique.mockResolvedValue(null);

    await expect(service.create('missing', dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the slot has already started', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      ...futureSlot(),
      startsAt: new Date(Date.now() - 60_000),
    });

    await expect(service.create('slot-1', dto)).rejects.toThrow(
      new ConflictException('This slot has already started.'),
    );
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the slot now clashes with the host calendar', async () => {
    const slot = futureSlot();
    prisma.slot.findUnique.mockResolvedValue(slot);
    calendar.findConflict.mockResolvedValue({
      start: slot.startsAt,
      end: new Date(slot.startsAt.getTime() + HOUR),
    });

    await expect(service.create(slot.id, dto)).rejects.toThrow(
      new ConflictException('This time is no longer available.'),
    );
    expect(calendar.findConflict).toHaveBeenCalledWith(
      slot.startsAt,
      new Date(slot.startsAt.getTime() + 30 * 60_000),
    );
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('books normally when the calendar reports no conflict (off or unreachable)', async () => {
    const slot = futureSlot();
    prisma.slot.findUnique.mockResolvedValue(slot);
    calendar.findConflict.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue({
      id: 'booking-1',
      slotId: slot.id,
      ...dto,
      aiMessage: null,
      createdAt: new Date(),
      slot,
    });

    await expect(service.create(slot.id, dto)).resolves.toMatchObject({
      id: 'booking-1',
    });
  });

  it('does not ask the calendar for a slot that has already started', async () => {
    prisma.slot.findUnique.mockResolvedValue({
      ...futureSlot(),
      startsAt: new Date(Date.now() - 60_000),
    });

    await expect(service.create('slot-1', dto)).rejects.toThrow(
      'This slot has already started.',
    );
    expect(calendar.findConflict).not.toHaveBeenCalled();
  });

  it.each([
    ['start', { startsAt: new Date(Date.now() + 2 * HOUR).toISOString() }],
    ['duration', { durationMin: 45 }],
  ])(
    'throws ConflictException when the host changed the %s since the booker loaded it',
    async (_label, seen) => {
      prisma.slot.findUnique.mockResolvedValue(futureSlot());

      await expect(
        service.create('slot-1', { ...dto, ...seen }),
      ).rejects.toThrow(
        new ConflictException('This time is no longer available.'),
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    },
  );

  it('books when the seen time matches the slot', async () => {
    const slot = futureSlot();
    prisma.slot.findUnique.mockResolvedValue(slot);
    prisma.booking.create.mockResolvedValue({
      id: 'booking-1',
      slotId: slot.id,
      ...dto,
      aiMessage: null,
      createdAt: new Date(),
      slot,
    });

    await expect(
      service.create(slot.id, {
        ...dto,
        startsAt: slot.startsAt.toISOString(),
        durationMin: slot.durationMin,
      }),
    ).resolves.toMatchObject({ id: 'booking-1' });
  });
});
