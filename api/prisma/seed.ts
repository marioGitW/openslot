/**
 * Demo data: wipes all bookings and slots, then creates 14 slots over the next
 * 7 days (Skopje time, 09:00–18:00) and books 4 of them.
 *
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const TIME_ZONE = 'Europe/Skopje';

interface SeedSlot {
  dayOffset: number;
  time: string;
  durationMin: number;
  topic: string;
  booking?: { name: string; email: string; note: string };
}

// Day 4 is left empty on purpose so the "no open times" state shows up.
const SLOTS: SeedSlot[] = [
  { dayOffset: 1, time: '09:00', durationMin: 30, topic: 'React performance' },
  {
    dayOffset: 1,
    time: '11:00',
    durationMin: 60,
    topic: 'System design',
    booking: {
      name: 'Ana Petrovska',
      email: 'ana.petrovska@example.com',
      note: 'Planning the notifications service. Want a second opinion on queues vs. cron.',
    },
  },
  { dayOffset: 1, time: '15:30', durationMin: 15, topic: 'Career chat' },
  { dayOffset: 2, time: '10:00', durationMin: 45, topic: 'Code review' },
  {
    dayOffset: 2,
    time: '14:00',
    durationMin: 30,
    topic: 'Testing strategy',
    booking: {
      name: 'Luka Nikolov',
      email: 'luka.nikolov@example.com',
      note: 'Our e2e suite takes 25 minutes. Where should we cut?',
    },
  },
  {
    dayOffset: 3,
    time: '09:30',
    durationMin: 60,
    topic: 'PostgreSQL and Prisma',
  },
  { dayOffset: 3, time: '16:00', durationMin: 30, topic: 'React performance' },
  { dayOffset: 5, time: '09:00', durationMin: 15, topic: 'Career chat' },
  {
    dayOffset: 5,
    time: '10:30',
    durationMin: 30,
    topic: 'Code review',
    booking: {
      name: 'Sara Ilievska',
      email: 'sara.ilievska@example.com',
      note: 'PR #142, the new booking form. Mostly unsure about the hook structure.',
    },
  },
  { dayOffset: 5, time: '13:00', durationMin: 60, topic: 'System design' },
  { dayOffset: 6, time: '11:00', durationMin: 45, topic: 'Testing strategy' },
  {
    dayOffset: 6,
    time: '17:00',
    durationMin: 60,
    topic: 'PostgreSQL and Prisma',
    booking: {
      name: 'Marko Trajkovski',
      email: 'marko.trajkovski@example.com',
      note: 'Slow query on the reports page, I will bring the EXPLAIN output.',
    },
  },
  { dayOffset: 7, time: '09:00', durationMin: 30, topic: 'React performance' },
  { dayOffset: 7, time: '14:30', durationMin: 45, topic: 'Code review' },
];

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function skopjeParts(date: Date) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((p) => [p.type, Number(p.value)]),
  );
  return parts as Record<
    'year' | 'month' | 'day' | 'hour' | 'minute' | 'second',
    number
  >;
}

// Skopje's UTC offset at `date`, in ms (e.g. +2h in summer).
function skopjeOffsetMs(date: Date): number {
  const p = skopjeParts(date);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Skopje wall-clock time → UTC instant (DST-aware).
function skopjeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = skopjeOffsetMs(new Date(wallAsUtc));
  const corrected = skopjeOffsetMs(new Date(wallAsUtc - offset));
  return new Date(wallAsUtc - corrected);
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const today = skopjeParts(new Date());

    await prisma.booking.deleteMany();
    await prisma.slot.deleteMany();

    for (const seed of SLOTS) {
      // Date.UTC normalises day overflow (e.g. 32 October → 1 November).
      const day = new Date(
        Date.UTC(today.year, today.month - 1, today.day + seed.dayOffset),
      );
      const [hour, minute] = seed.time.split(':').map(Number);
      const startsAt = skopjeToUtc(
        day.getUTCFullYear(),
        day.getUTCMonth() + 1,
        day.getUTCDate(),
        hour,
        minute,
      );

      await prisma.slot.create({
        data: {
          topic: seed.topic,
          startsAt,
          durationMin: seed.durationMin,
          booking: seed.booking ? { create: seed.booking } : undefined,
        },
      });
    }

    const booked = SLOTS.filter((s) => s.booking).length;
    console.log(`Seeded ${SLOTS.length} slots, ${booked} booked.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
