import {
  IsIn,
  IsInt,
  IsISO8601,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Trim } from '../../common/trim.transform';

export const SLOT_DURATIONS = [15, 30, 45, 60] as const;

export class CreateSlotDto {
  @Trim()
  @IsString()
  @Length(3, 60)
  topic: string;

  @IsISO8601({ strict: true })
  // Without an explicit offset the time would be read in the server's local zone.
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'startsAt must include a time zone offset (e.g. Z or +02:00)',
  })
  startsAt: string;

  @IsInt()
  @IsIn(SLOT_DURATIONS)
  durationMin: number;
}
