import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public 裝飾器
 * 標記不需要驗證的公開路由
 * 
 * @example
 * ```typescript
 * @Public()
 * @Post('login')
 * async login() {
 *   // 此路由不需要 JWT 驗證
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
