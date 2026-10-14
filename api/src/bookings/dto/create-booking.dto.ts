import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Trim, TrimLowercase } from '../../common/trim.transform';

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
}
