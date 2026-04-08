import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory, Gender } from 'src/common/enums';

export class CreateServiceDto {
  @ApiProperty({ example: 'Hair Cut', description: 'Service name (max 150 chars)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ enum: ServiceCategory, example: ServiceCategory.HAIR })
  @IsNotEmpty()
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiProperty({ example: 30, description: 'Duration in minutes' })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @ApiProperty({ example: 299.99, description: 'Price of the service' })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ enum: Gender, example: Gender.UNISEX, default: Gender.UNISEX })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'A classic hair cut for all hair types.' })
  @IsOptional()
  @IsString()
  description?: string;
}
