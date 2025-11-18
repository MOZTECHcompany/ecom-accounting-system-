import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * AuthController
 * 認證控制器，處理使用者註冊與登入相關的 HTTP 請求
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 使用者註冊
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: '使用者註冊' })
  @ApiResponse({ status: 201, description: '註冊成功' })
  @ApiResponse({ status: 409, description: 'Email 已存在' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 使用者登入
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用者登入' })
  @ApiResponse({ status: 200, description: '登入成功' })
  @ApiResponse({ status: 401, description: '登入失敗' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
