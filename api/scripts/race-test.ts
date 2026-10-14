/**
 * Double-booking race test against a running API.
 *
 * Creates a slot, fires two booking requests for it at the same time and asserts
 * that exactly one gets 201 and the other 409. Cleans up its own rows via Prisma.
 *
 * Usage: npm run test:race   (API_URL defaults to http://localhost:3000)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as unknown };
}

async function main(): Promise<boolean> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  // ~1 year out on a random quarter hour, so it can't clash with real slots.
  const startsAt = new Date(Date.now() + 365 * 24 * 60 * 60_000);
  startsAt.setUTCMinutes(Math.floor(Math.random() * 4) * 15, 0, 0);
  startsAt.setUTCHours(Math.floor(Math.random() * 24));

  let slotId: string | undefined;
  try {
    const created = await post('/slots', {
      topic: 'Race test',
      startsAt: startsAt.toISOString(),
      durationMin: 15,
    });
    if (created.status !== 201) {
      console.error('Could not create slot:', created.status, created.body);
      return false;
    }
    slotId = (created.body as { id: string }).id;
    console.log(`Created slot ${slotId}`);

    const [a, b] = await Promise.all([
      post(`/slots/${slotId}/bookings`, {
        name: 'Racer A',
        email: 'racer-a@example.com',
      }),
      post(`/slots/${slotId}/bookings`, {
        name: 'Racer B',
        email: 'racer-b@example.com',
      }),
    ]);
    console.log(`Request A: ${a.status}`);
    console.log(`Request B: ${b.status}`);

    const statuses = [a.status, b.status].sort();
    const ok = statuses[0] === 201 && statuses[1] === 409;
    console.log(
      ok ? 'PASS: one 201, one 409' : 'FAIL: expected one 201 and one 409',
    );
    return ok;
  } finally {
    if (slotId) {
      await prisma.booking.deleteMany({ where: { slotId } });
      await prisma.slot.deleteMany({ where: { id: slotId } });
      console.log('Cleaned up test slot and booking');
    }
    await prisma.$disconnect();
  }
}

main()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
