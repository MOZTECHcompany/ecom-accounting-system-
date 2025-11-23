import { IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

/**
 * DTO: UpdateRoleDto
 * 管理員更新角色資料
 */
export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[A-Z_]+$/, {
    message: 'code must contain only uppercase letters and underscores',
  })
  readonly code?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly hierarchyLevel?: number;
}
