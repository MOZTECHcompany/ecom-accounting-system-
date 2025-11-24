import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: '使用者 Email' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd',
    description: '密碼（至少 8 個字元）',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiProperty({ example: '張三', description: '使用者姓名' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
