import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [AiModule, CalendarModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
