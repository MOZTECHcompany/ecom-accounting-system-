import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: '使用者 Email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ssw0rd', description: '密碼' })
  @IsString()
  @MinLength(8)
  password!: string;
}
