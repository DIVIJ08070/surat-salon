import { IsEmail, IsString, MinLength, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'Password123!', description: 'The password of the user (min 6 chars)' })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password!: string;
}
