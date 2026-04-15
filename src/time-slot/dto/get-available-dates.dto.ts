import { IsInt, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAvailableDatesDto {
  @ApiProperty({ description: 'The ID of the stylist' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  stylistId!: number;

  @ApiProperty({ description: 'Total duration needed in minutes' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  durationMinutes!: number;

  @ApiPropertyOptional({ description: 'The month to check (1-12)', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'The year to check', example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}
