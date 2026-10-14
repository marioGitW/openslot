import {
  IsEmail,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Trim, TrimLowercase } from '../../common/trim.transform.js';

export class CreateBookingDto {
  @Trim()
  @IsString()
  @Length(2, 80)
  name: string;

  @TrimLowercase()
  @IsEmail()
  email: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(300)
  note?: string;

  /** The slot's start as the booker saw it; a mismatch means the host moved it. */
  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string;

  /** The slot's length as the booker saw it. */
  @IsOptional()
  @IsInt()
  durationMin?: number;
}
