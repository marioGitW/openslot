import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

/** Times are stored in UTC and shown to people in this zone. */
export const TIME_ZONE = 'Europe/Skopje';

/** `10:00–10:30`, or `16 Oct 00:00–17 Oct 00:00` when the range spans days. */
export function formatSkopjeRange(start: Date, end: Date): string {
  const from = new TZDate(start.getTime(), TIME_ZONE);
  const to = new TZDate(end.getTime(), TIME_ZONE);
  const sameDay = format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd');
  const pattern = sameDay ? 'HH:mm' : 'd MMM HH:mm';
  return `${format(from, pattern)}–${format(to, pattern)}`;
}
