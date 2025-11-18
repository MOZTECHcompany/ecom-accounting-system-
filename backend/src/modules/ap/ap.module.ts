import { Module } from '@nestjs/common';
import { ApController } from './ap.controller';
import { ApService } from './ap.service';
import { ApRepository } from './ap.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ApprovalsModule } from '../approvals/approvals.module'; // 依賴：審批流程
import { BankingModule } from '../banking/banking.module';       // 依賴：銀行付款

/**
 * ApModule
 * 應付帳款模組
 * 
 * 依賴模組：
 * - ApprovalsModule: 付款需要審批流程
 * - BankingModule: 付款透過銀行進行
 */
@Module({
  imports: [PrismaModule, ApprovalsModule, BankingModule],
  controllers: [ApController],
  providers: [ApService, ApRepository],
  exports: [ApService],
})
export class ApModule {}
