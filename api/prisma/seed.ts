/**
 * Demo data: wipes all bookings and slots, then creates slots over the next 14
 * days (Skopje time, 08:30–18:00), books some of them, and adds a few open slots
 * that clash with the demo Google Calendar.
 *
 * Usage: npm run db:seed
 */
import 'dotenv/config';
import { TZDate } from '@date-fns/tz';
import { PrismaPg } from '@prisma/adapter-pg';
import { TIME_ZONE } from '../src/common/time-zone';
import { PrismaClient } from '../src/generated/prisma/client';

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
  { dayOffset: 2, time: '10:30', durationMin: 45, topic: 'Code review' },
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
    time: '08:30',
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
  { dayOffset: 8, time: '09:00', durationMin: 30, topic: 'Code review' },
  {
    dayOffset: 8,
    time: '14:00',
    durationMin: 45,
    topic: 'System design',
    booking: {
      name: 'Ivana Stojanova',
      email: 'ivana.stojanova@example.com',
      note: 'Splitting a monolith into two services. Where should the boundary go?',
    },
  },
  {
    dayOffset: 9,
    time: '11:00',
    durationMin: 60,
    topic: 'PostgreSQL and Prisma',
  },
  { dayOffset: 9, time: '16:30', durationMin: 15, topic: 'Career chat' },
  { dayOffset: 10, time: '09:30', durationMin: 30, topic: 'React performance' },
  {
    dayOffset: 10,
    time: '15:00',
    durationMin: 60,
    topic: 'Testing strategy',
    booking: {
      name: 'Bojan Angelovski',
      email: 'bojan.angelovski@example.com',
      note: 'Flaky Playwright tests in CI. I will share a few failing runs.',
    },
  },
  { dayOffset: 11, time: '13:30', durationMin: 30, topic: 'Code review' },
  { dayOffset: 12, time: '10:30', durationMin: 45, topic: 'System design' },
  {
    dayOffset: 12,
    time: '17:00',
    durationMin: 30,
    topic: 'React performance',
    booking: {
      name: 'Simona Dimitrova',
      email: 'simona.dimitrova@example.com',
      note: 'Our dashboard re-renders on every keystroke. Profiler screenshots ready.',
    },
  },
  { dayOffset: 13, time: '11:00', durationMin: 30, topic: 'Career chat' },
  {
    dayOffset: 14,
    time: '09:00',
    durationMin: 60,
    topic: 'PostgreSQL and Prisma',
  },
  { dayOffset: 14, time: '14:30', durationMin: 30, topic: 'Testing strategy' },
];

interface ConflictSlot {
  /** 1 = the first Monday–Friday after today, 2 = the next one, … */
  weekday: number;
  time: string;
  durationMin: number;
  topic: string;
}

// The demo Google Calendar has "Team standup" 10:00–10:30 and "Lunch" 12:00–13:00
// every weekday. These open slots overlap them on purpose so the host view always
// shows calendar conflicts; they are inserted directly, past the API's check. The
// first weekday keeps 10:00 free, so publishing a slot at 10:15 there hits the
// calendar 409 rather than the slot overlap one. The regular slots above avoid
// both events.
const CONFLICTS: ConflictSlot[] = [
  { weekday: 1, time: '12:15', durationMin: 30, topic: 'Career chat' },
  { weekday: 2, time: '10:00', durationMin: 30, topic: 'Code review' },
  { weekday: 3, time: '10:00', durationMin: 30, topic: 'React performance' },
  { weekday: 4, time: '10:00', durationMin: 30, topic: 'Testing strategy' },
  { weekday: 5, time: '12:15', durationMin: 30, topic: 'System design' },
];

// Skopje wall-clock time `dayOffset` days after `today` → UTC instant (DST-aware).
// The Date constructor rolls day overflow over (32 October → 1 November).
function skopjeTime(
  today: TZDate,
  dayOffset: number,
  hour: number,
  minute: number,
): Date {
  const local = new TZDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + dayOffset,
    hour,
    minute,
    TIME_ZONE,
  );
  return new Date(local.getTime());
}

function slotStart(today: TZDate, dayOffset: number, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  return skopjeTime(today, dayOffset, hour, minute);
}

/** Day offsets of the next `count` Monday–Friday days, starting tomorrow. */
function nextWeekdayOffsets(today: TZDate, count: number): number[] {
  const offsets: number[] = [];
  for (let offset = 1; offsets.length < count; offset++) {
    const weekday = new TZDate(
      skopjeTime(today, offset, 12, 0).getTime(),
      TIME_ZONE,
    ).getDay();
    if (weekday !== 0 && weekday !== 6) offsets.push(offset);
  }
  return offsets;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const today = TZDate.tz(TIME_ZONE);

    await prisma.booking.deleteMany();
    await prisma.slot.deleteMany();

    for (const seed of SLOTS) {
      await prisma.slot.create({
        data: {
          topic: seed.topic,
          startsAt: slotStart(today, seed.dayOffset, seed.time),
          durationMin: seed.durationMin,
          booking: seed.booking ? { create: seed.booking } : undefined,
        },
      });
    }

    const weekdays = nextWeekdayOffsets(today, CONFLICTS.length);
    await prisma.slot.createMany({
      data: CONFLICTS.map((conflict) => ({
        topic: conflict.topic,
        startsAt: slotStart(
          today,
          weekdays[conflict.weekday - 1],
          conflict.time,
        ),
        durationMin: conflict.durationMin,
      })),
    });

    const booked = SLOTS.filter((s) => s.booking).length;
    console.log(
      `Seeded ${SLOTS.length + CONFLICTS.length} slots, ${booked} booked, ` +
        `${CONFLICTS.length} clashing with the demo calendar.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Message only: raw client errors can carry connection details.
  console.error(error instanceof Error ? error.message : 'Seed failed.');
  process.exit(1);
});
