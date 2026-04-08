import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StylistSpecialisation } from 'src/common/enums';

export class CreateStylistDto {
  @ApiProperty({ example: 'Riya Sharma', description: 'Full name of the stylist' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: StylistSpecialisation, example: StylistSpecialisation.HAIR_STYLIST })
  @IsNotEmpty()
  @IsEnum(StylistSpecialisation)
  specialisation!: StylistSpecialisation;

  @ApiProperty({ example: 'Mon,Tue,Wed,Thu,Fri', description: 'Working days as comma-separated values' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  workingDays!: string;

  @ApiProperty({ example: '09:00:00', description: 'Shift start time in HH:MM:SS format' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'shiftStart must be in HH:MM or HH:MM:SS format' })
  shiftStart!: string;

  @ApiProperty({ example: '18:00:00', description: 'Shift end time in HH:MM:SS format' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'shiftEnd must be in HH:MM or HH:MM:SS format' })
  shiftEnd!: string;

  @ApiPropertyOptional({ example: 15.00, description: 'Commission rate percentage (0-100)', default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionRate?: number;
}
