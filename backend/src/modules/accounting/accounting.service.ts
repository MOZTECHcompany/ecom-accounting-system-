import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * AccountingService
 * 會計服務，處理會計科目相關的業務邏輯
 */
@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查詢指定實體的會計科目表
   * @param entityId - 公司實體 ID
   * @param type - 科目類型篩選（可選）
   */
  async getAccountsByEntity(entityId: string, type?: string) {
    return this.prisma.account.findMany({
      where: {
        entityId,
        isActive: true,
        ...(type && { type }),
      },
      orderBy: [{ code: 'asc' }],
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * 根據科目代號查詢科目
   */
  async getAccountByCode(entityId: string, code: string) {
    const account = await this.prisma.account.findUnique({
      where: {
        entityId_code: {
          entityId,
          code,
        },
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Account with code ${code} not found for entity ${entityId}`,
      );
    }

    return account;
  }

  /**
   * 查詢會計期間
   * @param entityId - 公司實體 ID
   * @param status - 期間狀態篩選（可選）
   */
  async getPeriods(entityId: string, status?: string) {
    return this.prisma.period.findMany({
      where: {
        entityId,
        ...(status && { status }),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 取得當前開放的會計期間
   */
  async getCurrentOpenPeriod(entityId: string) {
    return this.prisma.period.findFirst({
      where: {
        entityId,
        status: 'open',
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 檢查期間是否可編輯
   */
  async isPeriodEditable(periodId: string): Promise<boolean> {
    const period = await this.prisma.period.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException(`Period ${periodId} not found`);
    }

    // closed 或 locked 的期間不可編輯
    return period.status === 'open';
  }

  /**
   * 建立手動會計分錄
   * @param data - 分錄資料
   */
  async createManualJournalEntry(data: {
    entityId: string;
    date: Date;
    description: string;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      currency?: string;
      fxRate?: number;
      memo?: string;
    }>;
    createdBy: string;
  }) {
    // TODO: 實作手動建立會計分錄
    // 1. 驗證借貸平衡
    // 2. 檢查期間是否開放
    // 3. 建立 JournalEntry 與 JournalLines
    this.logger.log('Creating manual journal entry...');
    throw new Error('Not implemented: createManualJournalEntry');
  }

  /**
   * 過帳會計分錄（標記為已審核）
   * @param journalEntryId - 分錄 ID
   * @param approvedBy - 審核者 ID
   */
  async postJournalEntry(journalEntryId: string, approvedBy: string) {
    // TODO: 實作分錄過帳
    // 1. 檢查分錄是否已審核
    // 2. 更新 approvedBy 和 approvedAt
    // 3. 記錄 audit log
    this.logger.log(`Posting journal entry ${journalEntryId}...`);
    throw new Error('Not implemented: postJournalEntry');
  }

  /**
   * 關閉會計期間
   * @param periodId - 期間 ID
   */
  async closePeriod(periodId: string) {
    // TODO: 實作期間關閉
    // 1. 檢查期間內所有分錄是否已審核
    // 2. 產生結轉分錄（損益類科目轉本期損益）
    // 3. 更新期間狀態為 closed
    this.logger.log(`Closing period ${periodId}...`);
    throw new Error('Not implemented: closePeriod');
  }

  /**
   * 產生銷貨成本分錄（月底結帳）
   * @param entityId - 公司實體 ID
   * @param periodId - 會計期間 ID
   */
  async generateCOGS(entityId: string, periodId: string) {
    // TODO: 實作銷貨成本計算
    // 1. 計算期初存貨
    // 2. 加上本期進貨
    // 3. 減去期末存貨
    // 4. 產生：借：銷貨成本，貸：存貨
    this.logger.log(`Generating COGS for period ${periodId}...`);
    throw new Error('Not implemented: generateCOGS');
  }

  /**
   * 產生折舊分錄（月底結帳）
   * @param entityId - 公司實體 ID
   * @param periodId - 會計期間 ID
   */
  async generateDepreciation(entityId: string, periodId: string) {
    // TODO: 實作折舊計算
    // 1. 查詢所有固定資產
    // 2. 計算本月折舊金額
    // 3. 產生：借：折舊費用，貸：累計折舊
    this.logger.log(`Generating depreciation for period ${periodId}...`);
    throw new Error('Not implemented: generateDepreciation');
  }

  /**
   * 取得總分類帳
   * @param entityId - 公司實體 ID
   * @param startDate - 開始日期
   * @param endDate - 結束日期
   * @param accountId - 科目 ID（可選）
   */
  async getGeneralLedger(
    entityId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string,
  ) {
    // TODO: 實作總分類帳查詢
    // 1. 查詢期間內所有已審核的分錄明細
    // 2. 按科目分組
    // 3. 計算累計餘額
    this.logger.log('Fetching general ledger...');
    throw new Error('Not implemented: getGeneralLedger');
  }

  /**
   * 取得試算表
   * @param entityId - 公司實體 ID
   * @param asOfDate - 截止日期
   */
  async getTrialBalance(entityId: string, asOfDate: Date) {
    // TODO: 實作試算表
    // 1. 查詢截止日前所有已審核的分錄明細
    // 2. 按科目加總借貸金額
    // 3. 計算餘額並驗證借貸平衡
    this.logger.log(`Fetching trial balance as of ${asOfDate}...`);
    throw new Error('Not implemented: getTrialBalance');
  }
}
