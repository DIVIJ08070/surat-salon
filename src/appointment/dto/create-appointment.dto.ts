import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1, description: 'Customer ID' })
  @IsInt()
  customerId!: number;

  @ApiProperty({ example: 2, description: 'Stylist ID' })
  @IsInt()
  stylistId!: number;

  @ApiProperty({ example: '2026-04-15', description: 'Appointment date (YYYY-MM-DD) — must be today or future' })
  @IsDateString()
  appointmentDate!: string;

  @ApiProperty({ example: '10:00:00', description: 'Start time (HH:MM:SS) — must match an available slot' })
  @IsString()
  startTime!: string;

  @ApiProperty({
    example: [1, 3],
    description: 'Array of service IDs to book',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  serviceIds!: number[];

  @ApiPropertyOptional({ example: 'First visit, prefers natural products' })
  @IsOptional()
  @IsString()
  notes?: string;
}
