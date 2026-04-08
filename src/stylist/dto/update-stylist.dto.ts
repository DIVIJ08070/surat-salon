import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateStylistDto } from './create-stylist.dto';
import { StylistStatus } from 'src/common/enums';

export class UpdateStylistDto extends PartialType(CreateStylistDto) {
  @IsOptional()
  @IsEnum(StylistStatus)
  stylistStatus?: StylistStatus;
}
