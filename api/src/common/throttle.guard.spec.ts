import { jest } from '@jest/globals';
import { Controller, Get, INestApplication, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { SkipThrottle, THROTTLE_MESSAGE, WriteThrottle } from './throttle.js';
import { clientKey, ThrottleGuard } from './throttle.guard.js';

@Controller('things')
class ThingsController {
  @Get()
  list() {
    return [];
  }

  @Get('other')
  other() {
    return [];
  }

  @Post()
  @WriteThrottle()
  create() {
    return {};
  }
}

@SkipThrottle()
@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

describe('ThrottleGuard', () => {
  let app: INestApplication<App>;
  let now: number;

  beforeEach(async () => {
    now = Date.UTC(2026, 9, 15, 8, 0, 0);
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const moduleRef = await Test.createTestingModule({
      controllers: [ThingsController, HealthController],
      providers: [{ provide: APP_GUARD, useClass: ThrottleGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);
  const post = (path: string) => request(app.getHttpServer()).post(path);

  async function send(times: number, call: () => request.Test) {
    for (let i = 0; i < times; i++) await call();
  }

  it('reports the limit, remaining requests and reset time', async () => {
    const res = await get('/things').expect(200);

    expect(res.headers['x-ratelimit-limit']).toBe('100');
    expect(res.headers['x-ratelimit-remaining']).toBe('99');
    expect(res.headers['x-ratelimit-reset']).toBe('60');
  });

  it('refuses the request after 100 in a minute with 429', async () => {
    await send(100, () => get('/things').expect(200));

    const res = await get('/things').expect(429);

    expect(res.body).toEqual({ statusCode: 429, message: THROTTLE_MESSAGE });
    expect(res.headers['retry-after']).toBe('60');
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('counts each route separately', async () => {
    await send(101, () => get('/things'));

    await get('/things').expect(429);
    await get('/things/other').expect(200);
  });

  it('allows 10 writes a minute with @WriteThrottle()', async () => {
    const first = await post('/things').expect(201);
    expect(first.headers['x-ratelimit-limit']).toBe('10');
    expect(first.headers['x-ratelimit-remaining']).toBe('9');
    await send(9, () => post('/things').expect(201));

    await post('/things').expect(429);
  });

  it('keeps the client blocked for a full minute, then counts again', async () => {
    await send(11, () => post('/things'));

    now += 59_000;
    const blocked = await post('/things').expect(429);
    expect(blocked.headers['retry-after']).toBe('1');

    now += 1_000;
    const res = await post('/things').expect(201);
    expect(res.headers['x-ratelimit-remaining']).toBe('9');
  });

  it('frees up requests as they leave the one-minute window', async () => {
    await send(5, () => post('/things').expect(201));
    now += 30_000;
    await send(5, () => post('/things').expect(201));

    now += 30_000;
    const res = await post('/things').expect(201);
    expect(res.headers['x-ratelimit-remaining']).toBe('4');
  });

  it('never limits @SkipThrottle() controllers', async () => {
    await send(120, () => get('/health').expect(200));

    const res = await get('/health').expect(200);
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });
});

describe('clientKey', () => {
  it('uses IPv4 addresses as they are', () => {
    expect(clientKey('203.0.113.7')).toBe('203.0.113.7');
  });

  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(clientKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(clientKey('::ffff:cb00:7107')).toBe('203.0.113.7');
  });

  it('keeps the IPv6 loopback address', () => {
    expect(clientKey('::1')).toBe('::1');
  });

  it('groups IPv6 addresses by their /64 subnet', () => {
    const a = clientKey('2001:db8:1:2:aaaa::1');
    expect(a).toBe('2001:db8:1:2::/64');
    expect(clientKey('2001:DB8:1:2:bbbb:cccc:dddd:eeee')).toBe(a);
    expect(clientKey('2001:db8:1:3::1')).not.toBe(a);
    expect(clientKey('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });

  it('falls back for a missing or unknown address', () => {
    expect(clientKey(undefined)).toBe('unknown');
    expect(clientKey('not-an-ip')).toBe('not-an-ip');
  });
});
