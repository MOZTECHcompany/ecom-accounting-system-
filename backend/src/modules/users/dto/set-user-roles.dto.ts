import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/**
 * DTO: SetUserRolesDto
 * 替使用者重新指派角色
 */
export class SetUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  readonly roleIds: string[];
}
