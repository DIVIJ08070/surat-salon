import { IsInt, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSlotsDto {
  @ApiProperty({ example: 1, description: 'Stylist ID to generate slots for' })
  @IsInt()
  stylistId!: number;

  @ApiProperty({ example: '2025-05-01', description: 'Start date (inclusive) — YYYY-MM-DD' })
  @IsDateString()
  fromDate!: string;

  @ApiProperty({ example: '2025-05-07', description: 'End date (inclusive) — YYYY-MM-DD' })
  @IsDateString()
  toDate!: string;

  @ApiPropertyOptional({ example: 30, description: 'Slot duration in minutes (default: 30)' })
  @IsOptional()
  @IsInt()
  slotDurationMinutes?: number;
}
