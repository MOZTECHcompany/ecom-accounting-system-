import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/**
 * DTO: SetRolePermissionsDto
 * 更新角色的權限列表
 */
export class SetRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  readonly permissionIds: string[];
}
