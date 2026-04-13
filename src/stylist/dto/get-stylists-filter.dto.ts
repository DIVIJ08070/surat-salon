import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
}
