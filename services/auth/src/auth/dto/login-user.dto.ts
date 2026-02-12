import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ example: '+256700000001' })
  @IsString()
  @MinLength(9)
  phone_number: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}