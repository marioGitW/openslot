import { SetMetadata } from '@nestjs/common';

export const THROTTLE_TTL_MS = 60_000;
/** Per-IP limit for every route: 100 requests per minute. */
export const DEFAULT_LIMIT = 100;
export const WRITE_LIMIT = 10;
export const THROTTLE_MESSAGE =
  'Too many requests. Please wait a minute and try again.';

export const THROTTLE_LIMIT_KEY = 'openslot:throttle-limit';
export const THROTTLE_SKIP_KEY = 'openslot:throttle-skip';

/** Stricter per-IP limit for endpoints that write: 10 requests per minute. */
export const WriteThrottle = () => SetMetadata(THROTTLE_LIMIT_KEY, WRITE_LIMIT);

/** No rate limit on this controller or route. */
export const SkipThrottle = () => SetMetadata(THROTTLE_SKIP_KEY, true);
