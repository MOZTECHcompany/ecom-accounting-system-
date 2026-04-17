import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { ShoplineHttpAdapter } from './shopline.adapter';
import { ShoplineController } from './shopline.controller';
import { ShoplineService } from './shopline.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ShoplineController],
  providers: [ShoplineService, ShoplineHttpAdapter],
  exports: [ShoplineService],
})
export class ShoplineIntegrationModule {}
