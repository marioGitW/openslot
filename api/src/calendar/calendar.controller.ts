import { Controller, Get } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('status')
  status() {
    return this.calendarService.getStatus();
  }
}
