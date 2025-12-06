import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { ShopifyHttpAdapter } from './shopify.adapter';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ShopifyController],
  providers: [ShopifyService, ShopifyHttpAdapter],
  exports: [ShopifyService],
})
export class ShopifyIntegrationModule {}
