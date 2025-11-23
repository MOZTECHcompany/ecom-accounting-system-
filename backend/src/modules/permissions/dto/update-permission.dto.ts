import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO: UpdatePermissionDto
 * 更新權限定義
 */
export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  readonly resource?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  readonly action?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;
}
