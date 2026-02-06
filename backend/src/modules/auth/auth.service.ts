import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * AuthService
 * 認證服務，處理所有與身份驗證相關的業務邏輯
 *
 * 主要功能：
 * - 使用者註冊（密碼加密）
 * - 使用者登入（密碼驗證 + JWT 產生）
 * - Token 驗證與解析
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 註冊新使用者
   * @param registerDto - 註冊資料
   * @returns 新建立的使用者與 JWT token
   */
  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    const normalizedEmail = (email ?? '').trim().toLowerCase();

    // 檢查 email 是否已存在
    const existingUser = await this.usersService.findForAuthByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 加密密碼
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // 建立使用者
    const user = await this.usersService.createForAuth({
      email: normalizedEmail,
      name,
      passwordHash,
    });

    this.logger.log(`New user registered: ${normalizedEmail}`);

    // 產生 JWT token
    const token = await this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      access_token: token,
    };
  }

  /**
   * 使用者登入
   * @param loginDto - 登入資料
   * @returns JWT token 與使用者資訊
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const emailInput = (email ?? '').trim();
    const normalizedEmail = emailInput.toLowerCase();

    // 尋找使用者
    const user = await this.usersService.findForAuthByEmail(normalizedEmail);
    if (!user) {
      this.logger.warn(`Login failed: user not found (${emailInput})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      this.logger.warn(`Login failed: missing password hash (${normalizedEmail})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 驗證密碼
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Login failed: bcrypt error (${normalizedEmail})`,
        err?.stack,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: invalid password (${emailInput})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 檢查使用者是否啟用
    if (!user.isActive) {
      this.logger.warn(`Login failed: user disabled (${emailInput})`);
      throw new UnauthorizedException('User account is disabled');
    }

    this.logger.log(`User logged in: ${normalizedEmail}`);

    // 產生 JWT token
    const token = await this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      access_token: token,
    };
  }

  /**
   * 驗證使用者（用於 JWT Strategy）
   * @param userId - 使用者 ID
   * @returns 使用者資訊
   */
  async validateUser(userId: string) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('User not found or inactive');
      }
      throw error;
    }
  }

  /**
   * 產生 JWT Token
   * @param userId - 使用者 ID
   * @param email - 使用者 Email
   * @returns JWT token 字串
   */
  private async generateToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email };
    return this.jwtService.signAsync(payload);
  }

  /**
   * 產生 2FA Secret
   */
  async generateTwoFactorSecret(userEmail: string) {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'EcomAccounting',
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    return {
      secret: secret.base32,
      otpauthUrl: totp.toString(),
    };
  }

  /**
   * 驗證 2FA Token
   */
  verifyTwoFactorToken(token: string, secret: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: 'EcomAccounting',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }

  /**
   * 啟用 2FA (需先驗證 Token)
   */
  async enableTwoFactor(userId: string, token: string, secret: string) {
    const isValid = this.verifyTwoFactorToken(token, secret);
    if (!isValid) {
      throw new BadRequestException('Invalid authentication code');
    }
    await this.usersService.updateTwoFactorConfig(userId, secret, true);
    return true;
  }
}

