import { IsArray, IsInt, ArrayNotEmpty, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignServicesDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of service IDs to assign to this stylist',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  serviceIds!: number[];
}
