import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendarService, normalizePrivateKey } from './calendar.service';

const mockQuery = jest.fn();
const mockJwt = jest.fn();

jest.mock('@googleapis/calendar', () => ({
  auth: { JWT: jest.fn((options: unknown) => mockJwt(options)) },
  calendar: jest.fn(() => ({ freebusy: { query: mockQuery } })),
}));

const CALENDAR_ID = 'host@example.com';
const ENV = {
  GOOGLE_CALENDAR_ID: CALENDAR_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'openslot@project.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY:
    '"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n"',
};

const DAY_MS = 24 * 60 * 60_000;
const timeMin = new Date('2030-01-07T08:00:00Z');
const timeMax = new Date('2030-01-07T18:00:00Z');

function makeService(env: Record<string, string | undefined> = ENV) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new CalendarService(config);
}

function busyResponse(busy: { start: string; end: string }[]) {
  return { data: { calendars: { [CALENDAR_ID]: { busy } } } };
}

describe('normalizePrivateKey', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n';

  it.each([
    [
      'literal \\n (Vercel)',
      '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    ],
    ['double quotes', `"${pem.replace(/\n/g, '\\n')}"`],
    ['single quotes', `'${pem.replace(/\n/g, '\\n')}'`],
    ['real newlines', pem],
    ['surrounding whitespace', `  ${pem}  `],
  ])('handles %s', (_label, raw) => {
    expect(normalizePrivateKey(raw).trim()).toBe(pem.trim());
  });
});

describe('CalendarService', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  it('parses busy intervals for the configured calendar', async () => {
    mockQuery.mockResolvedValue(
      busyResponse([
        { start: '2030-01-07T09:00:00Z', end: '2030-01-07T09:30:00Z' },
        { start: '2030-01-07T11:00:00Z', end: '2030-01-07T12:00:00Z' },
      ]),
    );
    const service = makeService();

    const result = await service.getBusyIntervals(timeMin, timeMax);

    expect(result).toEqual({
      ok: true,
      busy: [
        {
          start: new Date('2030-01-07T09:00:00Z'),
          end: new Date('2030-01-07T09:30:00Z'),
        },
        {
          start: new Date('2030-01-07T11:00:00Z'),
          end: new Date('2030-01-07T12:00:00Z'),
        },
      ],
    });
    expect(mockQuery).toHaveBeenCalledWith(
      {
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: CALENDAR_ID }],
        },
      },
      { timeout: 4000 },
    );
    expect(mockJwt).toHaveBeenCalledWith({
      email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
      scopes: ['https://www.googleapis.com/auth/calendar.freebusy'],
    });
    await expect(service.getStatus()).resolves.toEqual({
      enabled: true,
      ok: true,
    });
  });

  it('serves a second call for the same minute window from the cache', async () => {
    mockQuery.mockResolvedValue(busyResponse([]));
    const service = makeService();

    await service.getBusyIntervals(timeMin, timeMax);
    // Same window once rounded to the minute.
    await service.getBusyIntervals(
      new Date(timeMin.getTime() + 20_000),
      new Date(timeMax.getTime() - 20_000),
    );

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('splits windows longer than 60 days into several requests', async () => {
    mockQuery.mockResolvedValue(busyResponse([]));
    const service = makeService();

    await service.getBusyIntervals(
      timeMin,
      new Date(timeMin.getTime() + 130 * DAY_MS),
    );

    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('returns ok: false and logs once when Google errors', async () => {
    mockQuery.mockRejectedValue(new Error('invalid_grant'));
    const service = makeService();

    const first = await service.getBusyIntervals(timeMin, timeMax);
    const second = await service.getBusyIntervals(
      timeMin,
      new Date(timeMax.getTime() + DAY_MS),
    );

    expect(first).toEqual({ ok: false, busy: [] });
    expect(second).toEqual({ ok: false, busy: [] });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).not.toContain('PRIVATE KEY');
    await expect(service.getStatus()).resolves.toEqual({
      enabled: true,
      ok: false,
    });
  });

  it('returns ok: false when Google does not answer within 4 seconds', async () => {
    jest.useFakeTimers();
    mockQuery.mockReturnValue(new Promise(() => {}));
    const service = makeService();

    const promise = service.getBusyIntervals(timeMin, timeMax);
    await jest.advanceTimersByTimeAsync(4000);

    await expect(promise).resolves.toEqual({ ok: false, busy: [] });
  });

  it('returns ok: false when the calendar itself reports an error', async () => {
    mockQuery.mockResolvedValue({
      data: {
        calendars: {
          [CALENDAR_ID]: {
            busy: [],
            errors: [{ domain: 'global', reason: 'notFound' }],
          },
        },
      },
    });
    const service = makeService();

    await expect(service.getBusyIntervals(timeMin, timeMax)).resolves.toEqual({
      ok: false,
      busy: [],
    });
    expect(String(warn.mock.calls[0][0])).toContain('notFound');
  });

  it('finds the busy interval that overlaps a slot, ignoring touching ones', async () => {
    mockQuery.mockResolvedValue(
      busyResponse([
        { start: '2030-01-07T09:00:00Z', end: '2030-01-07T09:30:00Z' },
        { start: '2030-01-07T10:00:00Z', end: '2030-01-07T10:30:00Z' },
      ]),
    );
    const service = makeService();

    const conflict = await service.findConflict(
      new Date('2030-01-07T09:30:00Z'),
      new Date('2030-01-07T10:15:00Z'),
    );

    expect(conflict).toEqual({
      start: new Date('2030-01-07T10:00:00Z'),
      end: new Date('2030-01-07T10:30:00Z'),
    });
  });

  it.each([
    'GOOGLE_CALENDAR_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
  ])(
    'is disabled and never calls Google when %s is missing',
    async (missing) => {
      const service = makeService({ ...ENV, [missing]: '' });

      expect(service.isEnabled()).toBe(false);
      await expect(service.getBusyIntervals(timeMin, timeMax)).resolves.toEqual(
        { ok: false, busy: [] },
      );
      await expect(service.findConflict(timeMin, timeMax)).resolves.toBeNull();
      await expect(service.getStatus()).resolves.toEqual({
        enabled: false,
        ok: false,
      });
      expect(mockQuery).not.toHaveBeenCalled();
    },
  );

  it('probes Google for the status when nothing has been checked yet', async () => {
    mockQuery.mockResolvedValue(busyResponse([]));
    const service = makeService();

    await expect(service.getStatus()).resolves.toEqual({
      enabled: true,
      ok: true,
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
