import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersModule
 * 使用者管理模組
 *
 * 功能：
 * - 使用者 CRUD 操作
 * - 使用者角色管理
 * - 使用者權限查詢
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
