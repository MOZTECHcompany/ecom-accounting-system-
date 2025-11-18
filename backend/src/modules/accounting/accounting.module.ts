import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { JournalService } from './services/journal.service';
import { ReportService } from './services/report.service';

/**
 * AccountingModule
 * 會計模組，處理會計科目、分錄、報表等核心功能
 * 
 * 功能：
 * - 會計科目管理（Chart of Accounts）
 * - 會計分錄產生與查詢
 * - 會計期間管理與鎖帳
 * - 財務報表產生（損益表、資產負債表等）
 * - 分錄審核流程
 * 
 * 設計重點：
 * - 所有交易最終都會產生會計分錄
 * - 分錄是報表的唯一資料來源
 * - 支援多公司實體與多幣別
 */
@Module({
  controllers: [AccountingController],
  providers: [AccountingService, JournalService, ReportService],
  exports: [AccountingService, JournalService, ReportService],
})
export class AccountingModule {}
