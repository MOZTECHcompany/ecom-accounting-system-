import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO: CreatePermissionDto
 * 建立權限定義
 */
export class CreatePermissionDto {
  @IsString()
  @MinLength(2)
  readonly resource: string;

  @IsString()
  @MinLength(2)
  readonly action: string;

  @IsOptional()
  @IsString()
  readonly description?: string;
}
