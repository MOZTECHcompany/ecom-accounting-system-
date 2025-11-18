import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule
 * 全域模組，提供 Prisma Client 給整個應用程式使用
 * 使用 @Global() 裝飾器，讓所有模組都能直接注入 PrismaService
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
