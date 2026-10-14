import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [CalendarModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}
