import {
  IsISO8601,
  IsString,
  Length,
  Matches,
  ValidateBy,
} from 'class-validator';
import { Trim } from '../../common/trim.transform.js';
import { DURATION_MESSAGE, isValidDuration } from '../slot-duration.js';

// One check instead of IsInt/Min/Max/IsDivisibleBy, so a bad value gets one message.
const IsSlotDuration = () =>
  ValidateBy({
    name: 'isSlotDuration',
    validator: {
      validate: isValidDuration,
      defaultMessage: () => DURATION_MESSAGE,
    },
  });

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

  @IsSlotDuration()
  durationMin: number;
}
