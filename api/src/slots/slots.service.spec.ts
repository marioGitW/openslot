import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_DURATION_MIN } from './slot-duration';
import { SlotsService } from './slots.service';

const MINUTE = 60_000;

describe('SlotsService overlap rule', () => {
  let service: SlotsService;
  const prisma = {
    slot: { findMany: jest.fn(), create: jest.fn() },
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
    prisma.slot.findMany.mockResolvedValue([existing]);
    prisma.slot.create.mockImplementation(
      ({
        data,
      }: {
        data: { topic: string; startsAt: Date; durationMin: number };
      }) => Promise.resolve({ id: 'new', createdAt: new Date(), ...data }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [SlotsService, { provide: PrismaService, useValue: prisma }],
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
});
