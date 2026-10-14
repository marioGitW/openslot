import { Throttle } from '@nestjs/throttler';

/** Stricter per-IP limit for endpoints that write: 10 requests per minute. */
export const WriteThrottle = () =>
  Throttle({ default: { ttl: 60_000, limit: 10 } });
