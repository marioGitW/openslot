import { jest } from '@jest/globals';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Mocks return plain test objects, so async mocks are typed loosely.
type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const mockGenerate = jest.fn<AsyncFn>();

// ES modules are mocked before they are imported, so the modules that use
// @google/genai are loaded with `await import` after this.
jest.unstable_mockModule('@google/genai', () => ({
  ApiError: class extends Error {},
  // A plain class: `jest.resetAllMocks()` below would wipe a jest.fn implementation.
  GoogleGenAI: class {
    models = { generateContent: mockGenerate };
  },
}));

const { AiService } = await import('../ai/ai.service.js');
const { BookingsService } = await import('./bookings.service.js');

const HOUR = 60 * 60_000;

describe('BookingsService', () => {
  let service: InstanceType<typeof BookingsService>;
  const prisma = {
    slot: { findUnique: jest.fn<AsyncFn>() },
    booking: {
      create: jest.fn<AsyncFn>(),
      findUnique: jest.fn<AsyncFn>(),
      updateMany: jest.fn<AsyncFn>(),
    },
  };
  const calendar = { findConflict: jest.fn<AsyncFn>() };
  const ai = { generateBookingTexts: jest.fn<AsyncFn>() };

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
        { provide: AiService, useValue: ai },
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

  describe('generateAiMessage', () => {
    const slot = futureSlot();
    const booking = (overrides: object = {}) => ({
      id: 'booking-1',
      slotId: slot.id,
      ...dto,
      name: 'Ana Petrova',
      aiMessage: null,
      aiAgenda: [],
      aiGeneratedAt: null,
      createdAt: new Date(),
      slot,
      ...overrides,
    });
    const generated = {
      message: 'Hi Ana, see you soon.',
      agenda: ['One', 'Two', 'Three'],
      source: 'ai' as const,
    };

    it('generates text, stores it and returns it', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      ai.generateBookingTexts.mockResolvedValue(generated);
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.generateAiMessage('booking-1')).resolves.toEqual(
        generated,
      );
      expect(ai.generateBookingTexts).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        firstName: 'Ana',
        topic: slot.topic,
        startsAt: slot.startsAt,
        endsAt: new Date(slot.startsAt.getTime() + 30 * 60_000),
        note: dto.note,
      });
      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: { id: 'booking-1', aiGeneratedAt: null },
        data: {
          aiMessage: generated.message,
          aiAgenda: generated.agenda,
          aiGeneratedAt: expect.any(Date) as Date,
        },
      });
    });

    it('returns the stored text without calling Gemini again', async () => {
      prisma.booking.findUnique.mockResolvedValue(
        booking({
          aiMessage: generated.message,
          aiAgenda: generated.agenda,
          aiGeneratedAt: new Date(),
        }),
      );

      await expect(service.generateAiMessage('booking-1')).resolves.toEqual(
        generated,
      );
      expect(ai.generateBookingTexts).not.toHaveBeenCalled();
      expect(prisma.booking.updateMany).not.toHaveBeenCalled();
    });

    it('returns the fallback without storing it', async () => {
      const fallback = { message: 'Booked.', agenda: [], source: 'fallback' };
      prisma.booking.findUnique.mockResolvedValue(booking());
      ai.generateBookingTexts.mockResolvedValue(fallback);

      await expect(service.generateAiMessage('booking-1')).resolves.toEqual(
        fallback,
      );
      expect(prisma.booking.updateMany).not.toHaveBeenCalled();
    });

    it('returns the text stored by a concurrent request that won the write', async () => {
      const stored = { message: 'Stored first.', agenda: ['A', 'B', 'C'] };
      prisma.booking.findUnique
        .mockResolvedValueOnce(booking())
        .mockResolvedValueOnce(
          booking({
            aiMessage: stored.message,
            aiAgenda: stored.agenda,
            aiGeneratedAt: new Date(),
          }),
        );
      ai.generateBookingTexts.mockResolvedValue(generated);
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.generateAiMessage('booking-1')).resolves.toEqual({
        ...stored,
        source: 'ai',
      });
    });

    it('shares one Gemini call between concurrent requests', async () => {
      prisma.booking.findUnique.mockResolvedValue(booking());
      ai.generateBookingTexts.mockResolvedValue(generated);
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });

      const results = await Promise.all([
        service.generateAiMessage('booking-1'),
        service.generateAiMessage('booking-1'),
      ]);

      expect(results).toEqual([generated, generated]);
      expect(ai.generateBookingTexts).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when the booking does not exist', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.generateAiMessage('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateBookingTexts).not.toHaveBeenCalled();
    });
  });
});

describe('BookingsService with the real AiService', () => {
  it('never sends the booker email (or last name) to Gemini', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({
        message: 'Hi Ana, see you soon.',
        agenda: ['One', 'Two', 'Three'],
      }),
    });
    const slot = {
      id: 'slot-1',
      topic: 'Office hours',
      startsAt: new Date(Date.now() + HOUR),
      durationMin: 30,
      createdAt: new Date(),
    };
    const prisma = {
      booking: {
        findUnique: jest.fn<AsyncFn>().mockResolvedValue({
          id: 'booking-1',
          slotId: slot.id,
          name: 'Ana Petrova',
          email: 'ana.petrova@example.com',
          note: 'Hi',
          aiMessage: null,
          aiAgenda: [],
          aiGeneratedAt: null,
          createdAt: new Date(),
          slot,
        }),
        updateMany: jest.fn<AsyncFn>().mockResolvedValue({ count: 1 }),
      },
    };
    const env: Record<string, string> = {
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'gemini-test-model',
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        AiService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
      ],
    }).compile();

    await moduleRef.get(BookingsService).generateAiMessage('booking-1');

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const request = JSON.stringify(mockGenerate.mock.calls[0]);
    expect(request).not.toContain('ana.petrova@example.com');
    expect(request).not.toContain('@example.com');
    expect(request).not.toContain('Petrova');
  });
});
