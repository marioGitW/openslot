import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('slots/:id/bookings')
  create(
    @Param('id', ParseUUIDPipe) slotId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(slotId, dto);
  }

  @Get('bookings/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }
}
