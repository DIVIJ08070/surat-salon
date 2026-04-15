import { IsEnum, IsOptional, IsArray, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { StylistSpecialisation, StylistStatus } from 'src/common/enums';

export class GetStylistsFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StylistSpecialisation })
  @IsOptional()
  @IsEnum(StylistSpecialisation)
  specialisation?: StylistSpecialisation;

  @ApiPropertyOptional({ enum: StylistStatus })
  @IsOptional()
  @IsEnum(StylistStatus)
  stylistStatus?: StylistStatus;

  @ApiPropertyOptional({ type: [Number], description: 'Filter stylists who can perform all these services' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return [Number(value)];
    if (Array.isArray(value)) return value.map(v => Number(v));
    return value;
  })
  @IsArray()
  @IsInt({ each: true })
  serviceIds?: number[];
}
