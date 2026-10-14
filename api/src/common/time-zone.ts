import { TZDate } from '@date-fns/tz';
import { addDays, format, startOfDay } from 'date-fns';
import { Interval } from './intervals';

/** Times are stored in UTC and shown to people in this zone. */
export const TIME_ZONE = 'Europe/Skopje';

/** From the start of `start`'s Skopje day to the start of the day after `end`'s. */
export function skopjeDayWindow(start: Date, end: Date): Interval {
  const from = startOfDay(new TZDate(start.getTime(), TIME_ZONE));
  const to = startOfDay(addDays(new TZDate(end.getTime(), TIME_ZONE), 1));
  return { start: new Date(from.getTime()), end: new Date(to.getTime()) };
}

/** `Thursday 15 October` in Skopje. */
export function formatSkopjeDay(date: Date): string {
  return format(new TZDate(date.getTime(), TIME_ZONE), 'EEEE d MMMM');
}

/** `10:00` in Skopje. */
export function formatSkopjeTime(date: Date): string {
  return format(new TZDate(date.getTime(), TIME_ZONE), 'HH:mm');
}

/** `10:00–10:30`, or `16 Oct 00:00–17 Oct 00:00` when the range spans days. */
export function formatSkopjeRange(start: Date, end: Date): string {
  const from = new TZDate(start.getTime(), TIME_ZONE);
  const to = new TZDate(end.getTime(), TIME_ZONE);
  const sameDay = format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd');
  const pattern = sameDay ? 'HH:mm' : 'd MMM HH:mm';
  return `${format(from, pattern)}–${format(to, pattern)}`;
}

/** `Saturday 17 October, 08:30–09:30` in Skopje. */
export function formatSkopjeSlot(start: Date, end: Date): string {
  return `${formatSkopjeDay(start)}, ${formatSkopjeRange(start, end)}`;
}
