import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRepository } from './payroll.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module'; // 依賴：薪資分錄
import { ApprovalsModule } from '../approvals/approvals.module'; // 依賴：薪資審批

/**
 * PayrollModule
 * 薪資管理模組
 *
 * 依賴模組：
 * - AccountingModule: 薪資產生會計分錄
 * - ApprovalsModule: 薪資需要審批流程
 */
@Module({
  imports: [PrismaModule, AccountingModule, ApprovalsModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository],
  exports: [PayrollService],
})
export class PayrollModule {}
