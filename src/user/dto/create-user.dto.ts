import { IsEmail, IsString, MinLength, IsEnum, IsNotEmpty, IsOptional, IsObject } from "class-validator";
import { UserRole } from "src/common/enums";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'The password of the user (min 6 chars)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN, description: 'The role assigned to the user' })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ description: 'Optional stylist profile details (required if creating a stylist)', required: false })
  @IsOptional()
  @IsObject()
  stylistDetails?: {
    specialisation: string;
    workingDays: string;
    shiftStart: string;
    shiftEnd: string;
    commissionRate: number;
  };
}
