import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
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
