import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { InvoiceSyncController } from './invoice-sync.controller';
import { InvoiceSyncService } from './invoice-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvoiceSyncController],
  providers: [InvoiceSyncService],
  exports: [InvoiceSyncService],
})
export class InvoiceSyncModule {}
