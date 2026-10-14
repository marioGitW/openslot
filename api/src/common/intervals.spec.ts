import { findOverlap, overlaps } from './intervals.js';

const at = (time: string) => new Date(`2030-01-01T${time}:00Z`);
const range = (start: string, end: string) => ({
  start: at(start),
  end: at(end),
});

describe('overlaps', () => {
  const base = range('10:00', '10:30');

  it.each([
    ['starts inside', range('10:15', '10:45')],
    ['ends inside', range('09:45', '10:15')],
    ['contains', range('09:00', '11:00')],
    ['is contained', range('10:05', '10:10')],
    ['is identical', range('10:00', '10:30')],
  ])('is true when the other range %s', (_label, other) => {
    expect(overlaps(base, other)).toBe(true);
    expect(overlaps(other, base)).toBe(true);
  });

  it.each([
    ['starts exactly at the end', range('10:30', '11:00')],
    ['ends exactly at the start', range('09:30', '10:00')],
    ['is well apart', range('12:00', '13:00')],
  ])('is false when the other range %s', (_label, other) => {
    expect(overlaps(base, other)).toBe(false);
    expect(overlaps(other, base)).toBe(false);
  });
});

describe('findOverlap', () => {
  it('returns the first overlapping interval', () => {
    const first = range('10:00', '10:30');
    const second = range('10:15', '11:00');
    expect(findOverlap([first, second], range('10:20', '10:40'))).toBe(first);
  });

  it('returns undefined when nothing overlaps', () => {
    expect(
      findOverlap([range('10:00', '10:30')], range('10:30', '11:00')),
    ).toBeUndefined();
  });
});
