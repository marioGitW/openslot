/**
 * Generates the AI confirmation and host prep agenda for every booking that
 * doesn't have one yet, e.g. the demo bookings after `npm run db:seed`.
 *
 * Uses the same `BookingsService.generateAiMessage` as
 * `POST /bookings/:id/ai-message`, so results are validated and stored the same
 * way and fallbacks aren't stored. Runs one booking at a time with a short pause
 * to stay under the free-tier rate limit. Safe to re-run: it only picks up
 * bookings without AI text.
 *
 * Usage: npm run ai:backfill   (needs GEMINI_API_KEY and GEMINI_MODEL in .env)
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { setTimeout as sleep } from 'node:timers/promises';
import { AiService } from '../src/ai/ai.service';
import { AppModule } from '../src/app.module';
import { BookingsService } from '../src/bookings/bookings.service';
import { PrismaService } from '../src/prisma/prisma.service';

const PAUSE_MS = 2_000;

async function main(): Promise<boolean> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    if (!app.get(AiService).isEnabled()) {
      console.error('Set GEMINI_API_KEY and GEMINI_MODEL in .env first.');
      return false;
    }

    const pending = await app.get(PrismaService).booking.findMany({
      where: { aiGeneratedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`${pending.length} booking(s) without AI text.`);

    const bookings = app.get(BookingsService);
    let generated = 0;
    for (const [index, { id }] of pending.entries()) {
      if (index > 0) await sleep(PAUSE_MS);
      const { source } = await bookings.generateAiMessage(id);
      if (source === 'ai') generated++;
      console.log(`${index + 1}/${pending.length} ${id}: ${source}`);
    }

    const failed = pending.length - generated;
    console.log(
      `Done: ${generated} generated` +
        (failed ? `, ${failed} still on the template (re-run to retry).` : '.'),
    );
    return failed === 0;
  } finally {
    await app.close();
  }
}

main()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((error: unknown) => {
    // Message only: raw client errors can carry connection details.
    console.error(error instanceof Error ? error.message : 'Backfill failed.');
    process.exit(1);
  });
