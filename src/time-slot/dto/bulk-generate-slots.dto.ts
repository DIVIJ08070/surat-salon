import { IsInt, IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BulkGenerateSlotsDto {
  @ApiPropertyOptional({ example: '2025-05-01', description: 'Start date (inclusive) — YYYY-MM-DD. Defaults to today.' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2025-05-31', description: 'End date (inclusive) — YYYY-MM-DD. Defaults to 30 days from start date.' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ example: 30, description: 'Slot duration in minutes (default: 30)' })
  @IsOptional()
  @IsInt()
  slotDurationMinutes?: number;
}
