import { formatSkopjeRange, skopjeDayWindow } from './time-zone';

describe('formatSkopjeRange', () => {
  it('shows Skopje times for a same-day range', () => {
    // October is summer time (UTC+2).
    expect(
      formatSkopjeRange(
        new Date('2026-10-15T08:00:00Z'),
        new Date('2026-10-15T08:30:00Z'),
      ),
    ).toBe('10:00–10:30');
  });

  it('adds the date when the range spans days', () => {
    expect(
      formatSkopjeRange(
        new Date('2030-01-06T23:00:00Z'),
        new Date('2030-01-07T23:00:00Z'),
      ),
    ).toBe('7 Jan 00:00–8 Jan 00:00');
  });
});

describe('skopjeDayWindow', () => {
  it('covers whole Skopje days', () => {
    expect(
      skopjeDayWindow(
        new Date('2026-10-15T08:15:00Z'),
        new Date('2026-10-16T08:45:00Z'),
      ),
    ).toEqual({
      start: new Date('2026-10-14T22:00:00Z'),
      end: new Date('2026-10-16T22:00:00Z'),
    });
  });

  it('handles the day summer time ends', () => {
    // 25 October 2026 has 25 hours in Skopje.
    expect(
      skopjeDayWindow(
        new Date('2026-10-25T10:00:00Z'),
        new Date('2026-10-25T11:00:00Z'),
      ),
    ).toEqual({
      start: new Date('2026-10-24T22:00:00Z'),
      end: new Date('2026-10-25T23:00:00Z'),
    });
  });
});
