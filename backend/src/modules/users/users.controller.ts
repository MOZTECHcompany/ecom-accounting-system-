import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserRolesDto } from './dto/set-user-roles.dto';

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

  /**
   * 取得使用者列表（僅限 ADMIN）
   */
  @Get()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '查詢所有使用者（管理員）' })
  async listUsers(@Query('page') page = '1', @Query('limit') limit = '25') {
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNumber = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 25),
    );

    return this.usersService.findAll(pageNumber, limitNumber);
  }

  /**
   * 查詢單一使用者（僅限 ADMIN）
   */
  @Get(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '查詢指定使用者（管理員）' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /**
   * 建立新使用者（僅限 ADMIN）
   */
  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '建立新使用者（管理員）' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  /**
   * 更新使用者（僅限 ADMIN）
   */
  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '更新使用者資訊（管理員）' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  /**
   * 設定使用者角色（僅限 ADMIN）
   */
  @Put(':id/roles')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '設定使用者角色（管理員）' })
  async setRoles(@Param('id') id: string, @Body() dto: SetUserRolesDto) {
    return this.usersService.setUserRoles(id, dto.roleIds);
  }

  /**
   * 停用使用者（僅限 ADMIN）
   */
  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '停用使用者帳號（管理員）' })
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }
}
