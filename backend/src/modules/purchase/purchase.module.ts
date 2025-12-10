import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CostModule } from '../cost/cost.module';

@Module({
  imports: [PrismaModule, InventoryModule, CostModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
