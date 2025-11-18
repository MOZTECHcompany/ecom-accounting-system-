import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser 裝飾器
 * 從請求中提取當前登入使用者的資訊
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
