import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

/**
 * UsersController
 * 使用者控制器
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 取得當前使用者資訊
   */
  @Get('me')
  @ApiOperation({ summary: '取得當前使用者資訊' })
  async getCurrentUser(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  /**
   * 取得當前使用者的權限
   */
  @Get('me/permissions')
  @ApiOperation({ summary: '取得當前使用者的權限' })
  async getMyPermissions(@CurrentUser('id') userId: string) {
    return this.usersService.getUserPermissions(userId);
  }
}
