import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module.js';
import { SlotsController } from './slots.controller.js';
import { SlotsService } from './slots.service.js';

@Module({
  imports: [CalendarModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}
