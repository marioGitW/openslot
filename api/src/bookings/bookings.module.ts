import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CalendarModule } from '../calendar/calendar.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AiModule, CalendarModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
