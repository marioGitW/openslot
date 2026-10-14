import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auth, calendar, calendar_v3 } from '@googleapis/calendar';
import { findOverlap, Interval } from '../common/intervals';

// Least privilege: free/busy only, no event titles or details.
const FREEBUSY_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 60_000;
// Failures are cached briefly so an outage doesn't add the timeout to every request.
const FAILURE_TTL_MS = 15_000;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
// Google rejects free/busy windows that are too long; stay well under the limit.
const MAX_WINDOW_MS = 60 * DAY_MS;

export interface BusyResult {
  ok: boolean;
  busy: Interval[];
}

export interface CalendarStatus {
  enabled: boolean;
  ok: boolean;
}

interface Credentials {
  calendarId: string;
  email: string;
  key: string;
}

/**
 * Accepts the key as pasted in a local .env (often quoted) or in Vercel (literal
 * `\n` instead of newlines).
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  const quote = key[0];
  if (
    key.length >= 2 &&
    (quote === '"' || quote === "'") &&
    key.endsWith(quote)
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function floorToMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / MINUTE_MS) * MINUTE_MS);
}

function ceilToMinute(date: Date): Date {
  return new Date(Math.ceil(date.getTime() / MINUTE_MS) * MINUTE_MS);
}

function splitWindow(start: Date, end: Date): Interval[] {
  const chunks: Interval[] = [];
  for (
    let from = start.getTime();
    from < end.getTime();
    from += MAX_WINDOW_MS
  ) {
    const to = Math.min(from + MAX_WINDOW_MS, end.getTime());
    chunks.push({ start: new Date(from), end: new Date(to) });
  }
  return chunks;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Reads the host's busy times from Google Calendar.
 *
 * Fails open: when the env vars are missing the feature is off, and when Google
 * errors or times out the result is `ok: false` with no busy times, so slots stay
 * visible and bookable. A calendar outage must never take booking down with it;
 * the worst case is a booking that clashes with a calendar event, which the host
 * can resolve by hand.
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly credentials: Credentials | null;
  private client: calendar_v3.Calendar | null = null;
  private readonly cache = new Map<
    string,
    { expiresAt: number; result: BusyResult }
  >();
  private lastOk: boolean | null = null;

  constructor(config: ConfigService) {
    const calendarId = config.get<string>('GOOGLE_CALENDAR_ID')?.trim();
    const email = config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL')?.trim();
    const rawKey = config.get<string>('GOOGLE_PRIVATE_KEY')?.trim();
    this.credentials =
      calendarId && email && rawKey
        ? { calendarId, email, key: normalizePrivateKey(rawKey) }
        : null;
  }

  isEnabled(): boolean {
    return this.credentials !== null;
  }

  async getStatus(): Promise<CalendarStatus> {
    if (!this.isEnabled()) return { enabled: false, ok: false };
    // A fresh (e.g. serverless) instance has no last check yet, so make one.
    if (this.lastOk === null) {
      const now = new Date();
      await this.getBusyIntervals(now, new Date(now.getTime() + DAY_MS));
    }
    return { enabled: true, ok: this.lastOk === true };
  }

  async getBusyIntervals(timeMin: Date, timeMax: Date): Promise<BusyResult> {
    const credentials = this.credentials;
    if (!credentials) return { ok: false, busy: [] };

    const start = floorToMinute(timeMin);
    const end = ceilToMinute(timeMax);
    if (end <= start) return { ok: true, busy: [] };

    const key = `${start.toISOString()}/${end.toISOString()}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const result = await this.fetchBusy(credentials, start, end);
    this.remember(key, result);
    return result;
  }

  /** First busy interval overlapping [start, end), or null (also when Google fails). */
  async findConflict(start: Date, end: Date): Promise<Interval | null> {
    const { busy } = await this.getBusyIntervals(start, end);
    return findOverlap(busy, { start, end }) ?? null;
  }

  private async fetchBusy(
    credentials: Credentials,
    start: Date,
    end: Date,
  ): Promise<BusyResult> {
    try {
      const chunks = splitWindow(start, end);
      const parts = await withTimeout(
        Promise.all(chunks.map((chunk) => this.queryChunk(credentials, chunk))),
        TIMEOUT_MS,
      );
      if (this.lastOk === false) {
        this.logger.log('Google Calendar check succeeded again.');
      }
      this.lastOk = true;
      return { ok: true, busy: parts.flat() };
    } catch (error) {
      // Log once per failure streak, and only the message: Google client errors
      // carry the request config, including the Authorization header.
      if (this.lastOk !== false) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(
          `Google Calendar check failed, showing all slots: ${reason}`,
        );
      }
      this.lastOk = false;
      return { ok: false, busy: [] };
    }
  }

  private async queryChunk(
    credentials: Credentials,
    chunk: Interval,
  ): Promise<Interval[]> {
    const { calendarId } = credentials;
    const { data } = await this.getClient(credentials).freebusy.query(
      {
        requestBody: {
          timeMin: chunk.start.toISOString(),
          timeMax: chunk.end.toISOString(),
          items: [{ id: calendarId }],
        },
      },
      { timeout: TIMEOUT_MS },
    );

    // A calendar that isn't shared with the service account comes back with
    // `errors: [{ reason: 'notFound' }]` instead of failing the request.
    const entry = data.calendars?.[calendarId];
    if (!entry) {
      throw new Error('Calendar missing from the free/busy response');
    }
    if (entry.errors?.length) {
      const reasons = entry.errors.map((e) => e.reason ?? 'unknown');
      throw new Error(`Calendar returned errors: ${reasons.join(', ')}`);
    }

    return (entry.busy ?? []).flatMap((period) =>
      period.start && period.end
        ? [{ start: new Date(period.start), end: new Date(period.end) }]
        : [],
    );
  }

  private getClient({ email, key }: Credentials): calendar_v3.Calendar {
    if (!this.client) {
      const jwt = new auth.JWT({ email, key, scopes: [FREEBUSY_SCOPE] });
      this.client = calendar({ version: 'v3', auth: jwt });
    }
    return this.client;
  }

  private remember(key: string, result: BusyResult): void {
    const now = Date.now();
    for (const [cachedKey, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(cachedKey);
    }
    const ttl = result.ok ? CACHE_TTL_MS : FAILURE_TTL_MS;
    this.cache.set(key, { expiresAt: now + ttl, result });
  }
}
