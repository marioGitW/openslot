import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [CalendarModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
