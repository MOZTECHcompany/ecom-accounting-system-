import { Module } from '@nestjs/common';
import { AssemblyService } from './assembly.service';
import { AssemblyController } from './assembly.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CostModule } from '../cost/cost.module';

@Module({
  imports: [PrismaModule, InventoryModule, CostModule],
  controllers: [AssemblyController],
  providers: [AssemblyService],
  exports: [AssemblyService],
})
export class AssemblyModule {}
