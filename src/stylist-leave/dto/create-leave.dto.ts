import {
  IsDateString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveDto {
  @ApiProperty({ example: 1, description: 'ID of the stylist requesting leave' })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  stylistId!: number;

  @ApiProperty({ example: '2025-01-15', description: 'Date of leave (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  leaveDate!: string;

  @ApiPropertyOptional({ example: '09:00:00', description: 'Partial leave start time (null = full day)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'leaveStart must be in HH:MM or HH:MM:SS format' })
  leaveStart?: string;

  @ApiPropertyOptional({ example: '13:00:00', description: 'Partial leave end time (null = full day)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'leaveEnd must be in HH:MM or HH:MM:SS format' })
  leaveEnd?: string;

  @ApiPropertyOptional({ example: 'Personal appointment', description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
