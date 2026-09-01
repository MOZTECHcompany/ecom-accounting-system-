import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalInvoiceIngestionService } from './external-invoice-ingestion.service';

@Module({
  imports: [PrismaModule],
  providers: [ExternalInvoiceIngestionService],
  exports: [ExternalInvoiceIngestionService],
})
export class ExternalInvoiceIngestionModule {}
