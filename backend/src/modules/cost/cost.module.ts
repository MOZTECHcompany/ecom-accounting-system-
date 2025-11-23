import { Module } from '@nestjs/common';
import { CostService } from './cost.service';
import { CostRepository } from './cost.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  providers: [CostService, CostRepository],
  exports: [CostService],
})
export class CostModule {}
