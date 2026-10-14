import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { isIP } from 'node:net';
import {
  DEFAULT_LIMIT,
  THROTTLE_LIMIT_KEY,
  THROTTLE_MESSAGE,
  THROTTLE_SKIP_KEY,
  THROTTLE_TTL_MS,
} from './throttle.js';

interface Counter {
  /** Expiry time of each counted request in the sliding window. */
  hits: number[];
  /** End of the current window, reported as X-RateLimit-Reset. */
  windowEndsAt: number;
  /** Set once the limit is exceeded; requests are refused until then. */
  blockedUntil: number;
}

const toSeconds = (ms: number) => Math.ceil(ms / 1000);

/** Splits a valid IPv6 address (as accepted by `isIP`) into its 8 groups. */
function ipv6Groups(address: string): number[] {
  let text = address.toLowerCase();
  // A trailing dotted IPv4 part (e.g. ::ffff:1.2.3.4) becomes two groups.
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (dotted) {
    const [a, b, c, d] = dotted.slice(1).map(Number);
    text =
      text.slice(0, dotted.index) +
      `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const fill = text.includes('::') ? 8 - left.length - right.length : 0;
  return [...left, ...Array<string>(fill).fill('0'), ...right].map((group) =>
    parseInt(group, 16),
  );
}

/**
 * Who a request counts against: the IPv4 address, or the /64 subnet for IPv6
 * (one client usually gets a whole /64, so per-address limits are easy to dodge).
 */
export function clientKey(ip: string | undefined): string {
  if (!ip) return 'unknown';
  const bare = ip.split('%')[0];
  const version = isIP(bare);
  if (version === 4) return bare;
  if (version !== 6) return ip;

  const groups = ipv6Groups(bare);
  const zeros = (from: number, to: number) =>
    groups.slice(from, to).every((group) => group === 0);
  if (zeros(0, 7) && groups[7] === 1) return '::1';
  if (zeros(0, 5) && groups[5] === 0xffff) {
    const [high, low] = [groups[6], groups[7]];
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
  }
  const subnet = groups.slice(0, 4).map((group) => group.toString(16));
  return `${subnet.join(':')}::/64`;
}

/**
 * Per-IP rate limit, counted separately for each route: 100 requests per minute,
 * or the `@WriteThrottle()` limit; `@SkipThrottle()` turns it off. A client that
 * goes over the limit is refused with 429 for a full minute.
 *
 * Replaces @nestjs/throttler with the same behaviour and headers: that package
 * is CommonJS and require()s the ESM-only @nestjs/common, which fails wherever
 * require(esm) is off (as on Vercel).
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly counters = new Map<string, Counter>();
  private lastSweepAt = 0;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(THROTTLE_SKIP_KEY, targets)) {
      return true;
    }
    const limit =
      this.reflector.getAllAndOverride<number>(THROTTLE_LIMIT_KEY, targets) ??
      DEFAULT_LIMIT;

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const route = `${context.getClass().name}-${context.getHandler().name}`;
    const now = Date.now();
    const counter = this.count(`${route}-${clientKey(req.ip)}`, limit, now);

    if (counter.blockedUntil > now) {
      res.setHeader('Retry-After', toSeconds(counter.blockedUntil - now));
      throw new HttpException(THROTTLE_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, limit - counter.hits.length),
    );
    res.setHeader('X-RateLimit-Reset', toSeconds(counter.windowEndsAt - now));
    return true;
  }

  /** Records one request for `key` and returns its updated counter. */
  private count(key: string, limit: number, now: number): Counter {
    this.sweep(now);
    let counter = this.counters.get(key);
    if (!counter) {
      counter = {
        hits: [],
        windowEndsAt: now + THROTTLE_TTL_MS,
        blockedUntil: 0,
      };
      this.counters.set(key, counter);
    }
    counter.hits = counter.hits.filter((expiresAt) => expiresAt > now);
    if (counter.windowEndsAt <= now) {
      counter.windowEndsAt = now + THROTTLE_TTL_MS;
    }

    const blocked = counter.blockedUntil > 0;
    if (blocked && counter.blockedUntil <= now) {
      // The block is over: start counting again from this request.
      counter.blockedUntil = 0;
      counter.hits = [now + THROTTLE_TTL_MS];
    } else if (!blocked) {
      counter.hits.push(now + THROTTLE_TTL_MS);
      if (counter.hits.length > limit) {
        counter.blockedUntil = now + THROTTLE_TTL_MS;
      }
    }
    return counter;
  }

  /** Drops idle counters at most once per window, so memory stays bounded. */
  private sweep(now: number): void {
    if (now - this.lastSweepAt < THROTTLE_TTL_MS) return;
    this.lastSweepAt = now;
    for (const [key, counter] of this.counters) {
      const idle =
        counter.blockedUntil <= now &&
        counter.windowEndsAt <= now &&
        counter.hits.every((expiresAt) => expiresAt <= now);
      if (idle) this.counters.delete(key);
    }
  }
}
