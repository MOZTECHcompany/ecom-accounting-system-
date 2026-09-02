import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AfterSalesController } from './after-sales.controller';
import { AfterSalesLegacyAdapter } from './after-sales-legacy.adapter';
import { AfterSalesMigrationService } from './after-sales-migration.service';

@Module({
  imports: [PrismaModule],
  controllers: [AfterSalesController],
  providers: [AfterSalesLegacyAdapter, AfterSalesMigrationService, RolesGuard],
  exports: [AfterSalesLegacyAdapter],
})
export class AfterSalesIntegrationModule {}
