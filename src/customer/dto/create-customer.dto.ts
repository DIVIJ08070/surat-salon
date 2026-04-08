import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsDateString,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from 'src/common/enums';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Divij Patel', description: 'Full name of the customer' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '9876543210', description: 'Unique 10-digit phone number' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'Phone must be 10 to 15 digits' })
  phone!: string;

  @ApiPropertyOptional({ example: 'divij@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '1998-05-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dob?: string;
}
