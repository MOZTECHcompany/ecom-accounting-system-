import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './env.validation';

/**
 * ConfigModule
 * 全域設定模組，管理環境變數與應用程式設定
 * - 載入 .env 檔案
 * - 驗證必要的環境變數
 * - 提供全域可用的設定服務
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '.env.production',
      ],
      validate,
    }),
  ],
})
export class ConfigModule {}
