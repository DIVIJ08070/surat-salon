import { IsInt, IsDateString, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'Total duration needed in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationMinutes?: number;
}
