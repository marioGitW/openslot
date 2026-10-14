/** A half-open time range [start, end). */
export interface Interval {
  start: Date;
  end: Date;
}

/** True when the ranges share time; touching ends (10:30 end, 10:30 start) don't. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** First interval in `list` that overlaps `target`. */
export function findOverlap<T extends Interval>(
  list: readonly T[],
  target: Interval,
): T | undefined {
  return list.find((item) => overlaps(item, target));
}
