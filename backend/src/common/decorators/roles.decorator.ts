import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles() decorator
 * 用於控制器或方法層級，指定允許的角色
 * 
 * 使用範例：
 * @Roles('ADMIN', 'ACCOUNTANT')
 * async someMethod() {}
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
