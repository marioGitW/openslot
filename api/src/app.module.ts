import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BookingsModule } from './bookings/bookings.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { ThrottleGuard } from './common/throttle.guard.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SlotsModule } from './slots/slots.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    CalendarModule,
    SlotsModule,
    BookingsModule,
  ],
  // 100 requests per minute per IP on each route; writes have stricter limits
  // (see WriteThrottle). The store is in memory, so on Vercel each serverless
  // instance counts on its own: basic abuse protection, not a guarantee.
  providers: [{ provide: APP_GUARD, useClass: ThrottleGuard }],
})
export class AppModule {}
