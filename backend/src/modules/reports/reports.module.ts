import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExpenseIntelligenceService } from './expense-intelligence.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExpenseIntelligenceService],
  exports: [ReportsService, ExpenseIntelligenceService],
})
export class ReportsModule {}
