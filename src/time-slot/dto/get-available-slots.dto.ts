import { IsInt, IsDateString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetAvailableSlotsDto {
  @ApiProperty({ description: 'The ID of the stylist' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  stylistId!: number;

  @ApiProperty({ description: 'The date to check (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date!: string;
}
