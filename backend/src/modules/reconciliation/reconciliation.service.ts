import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportBankTransactionsDto } from './dto/import-bank-transactions.dto';
import { AutoMatchDto } from './dto/auto-match.dto';

/**
 * ReconciliationService
 * 
 * 銀行對帳服務
 * 
 * TODO: 實作項目
 * 1. 解析各家銀行CSV格式
 * 2. 虛擬帳號邏輯匹配
 * 3. 多維度自動比對規則：
 *    - 精準匹配：金額+日期+虛擬帳號
 *    - 模糊匹配：金額+日期範圍±3天
 *    - 客戶名稱匹配（模糊搜尋）
 *    - 備註欄位關鍵字匹配
 * 4. 人工確認流程
 * 5. 差異分析報表
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 匯入銀行明細
   * 
   * @param dto - 銀行交易清單
   * @param userId - 操作者ID
   * @returns 匯入結果統計
   * 
   * TODO: 實作邏輯
   * - 解析CSV/JSON格式
   * - 驗證必要欄位（日期、金額、摘要）
   * - 檢查重複交易
   * - 儲存至 bank_transactions 表
   * - 標記待對帳狀態
   */
  async importBankTransactions(
    dto: ImportBankTransactionsDto,
    userId: string,
  ) {
    this.logger.log(
      `匯入銀行明細 - 帳戶: ${dto.bankAccountId}, 筆數: ${dto.transactions.length}, 操作者: ${userId}`,
    );

    // TODO: 實作匯入邏輯
    // 目前回傳 mock 結果
    const mockImportedCount = dto.transactions.length;
    const mockDuplicateCount = 0;
    const mockSkippedCount = 0;

    return {
      success: true,
      summary: {
        total: dto.transactions.length,
        imported: mockImportedCount,
        duplicates: mockDuplicateCount,
        skipped: mockSkippedCount,
      },
      transactions: dto.transactions.map((t, index) => ({
        id: `mock-tx-${index}`,
        date: t.date,
        amount: t.amount,
        description: t.description,
        status: 'PENDING', // 待對帳
      })),
      message: `成功匯入 ${mockImportedCount} 筆銀行交易（模擬）`,
    };
  }

  /**
   * 自動比對銀行交易與會計記錄
   * 
   * @param dto - 自動比對設定
   * @param userId - 操作者ID
   * @returns 比對結果
   * 
   * TODO: 實作邏輯
   * 1. 精準匹配規則：
   *    - 金額完全相同
   *    - 日期在指定範圍內（±N天）
   *    - 虛擬帳號匹配
   * 
   * 2. 模糊匹配規則：
   *    - 金額相近（誤差範圍內）
   *    - 客戶名稱模糊搜尋
   *    - 備註關鍵字匹配
   * 
   * 3. 匹配後處理：
   *    - 更新 BankTransaction.reconciledAt
   *    - 建立關聯（transaction <-> journal_entry）
   *    - 產生對帳報告
   */
  async autoMatchBankTransactions(dto: AutoMatchDto, userId: string) {
    this.logger.log(
      `自動對帳 - 帳戶: ${dto.bankAccountId}, 日期範圍: ${dto.dateFrom} ~ ${dto.dateTo}, 操作者: ${userId}`,
    );

    // TODO: 實作自動對帳邏輯
    // 目前回傳 mock 結果
    return {
      success: true,
      summary: {
        totalBankTransactions: 10, // 待對帳的銀行交易數
        matched: 7, // 成功匹配
        unmatched: 3, // 無法匹配
        ambiguous: 0, // 有多個可能匹配，需人工確認
      },
      
      // 成功匹配的項目
      matched: [
        {
          bankTransactionId: 'bt-001',
          journalEntryId: 'je-001',
          matchType: 'EXACT', // EXACT: 精準, FUZZY: 模糊
          confidence: 1.0, // 信心度 0~1
          matchedFields: ['amount', 'date', 'virtualAccount'],
        },
        {
          bankTransactionId: 'bt-002',
          journalEntryId: 'je-002',
          matchType: 'FUZZY',
          confidence: 0.85,
          matchedFields: ['amount', 'date'],
        },
      ],
      
      // 無法匹配的項目
      unmatched: [
        {
          bankTransactionId: 'bt-008',
          date: '2025-01-15',
          amount: 1500,
          description: '匯款入帳',
          reason: 'NO_MATCHING_JOURNAL_ENTRY', // 找不到對應會計記錄
          suggestions: [], // 建議的可能匹配（未來可用ML預測）
        },
      ],
      
      message: '自動對帳完成（模擬）。實際環境需實作匹配規則引擎。',
    };
  }

  /**
   * 查詢待對帳項目
   * 
   * @param bankAccountId - 銀行帳戶ID
   * @param entityId - 公司實體ID
   * @returns 待對帳清單
   * 
   * TODO: 實作邏輯
   * - 查詢 reconciledAt = null 的 BankTransaction
   * - 提供篩選條件（日期、金額範圍、狀態）
   * - 顯示建議匹配項目
   */
  async getPendingItems(bankAccountId: string, entityId: string) {
    this.logger.log(
      `查詢待對帳項目 - 帳戶: ${bankAccountId}, 實體: ${entityId}`,
    );

    // TODO: 實作查詢邏輯
    // 目前回傳 mock 資料
    return {
      pending: [
        {
          id: 'bt-008',
          date: '2025-01-15',
          amount: 1500,
          currency: 'TWD',
          description: '匯款入帳',
          status: 'PENDING',
          suggestedMatches: [], // 建議的可能匹配
        },
        {
          id: 'bt-009',
          date: '2025-01-16',
          amount: 2000,
          currency: 'TWD',
          description: '客戶付款',
          status: 'PENDING',
          suggestedMatches: [
            {
              journalEntryId: 'je-010',
              confidence: 0.75,
              reason: '金額與日期相符',
            },
          ],
        },
      ],
      summary: {
        totalPending: 2,
        totalAmount: 3500,
      },
      message: '待對帳項目清單（模擬）',
    };
  }

  /**
   * 手動確認匹配
   * 
   * @param bankTransactionId - 銀行交易ID
   * @param journalEntryId - 會計分錄ID
   * @param userId - 操作者ID
   * @returns 確認結果
   * 
   * TODO: 實作邏輯
   * - 驗證兩者是否真的對應
   * - 更新對帳狀態
   * - 記錄人工確認歷史
   */
  async manualMatch(
    bankTransactionId: string,
    journalEntryId: string,
    userId: string,
  ) {
    this.logger.log(
      `手動對帳 - 銀行交易: ${bankTransactionId}, 分錄: ${journalEntryId}, 操作者: ${userId}`,
    );

    // TODO: 實作手動對帳邏輯
    return {
      success: true,
      bankTransactionId,
      journalEntryId,
      reconciledAt: new Date(),
      reconciledBy: userId,
      message: '手動對帳成功（模擬）',
    };
  }

  /**
   * 取消匹配
   * 
   * @param bankTransactionId - 銀行交易ID
   * @param reason - 取消原因
   * @param userId - 操作者ID
   * @returns 取消結果
   * 
   * TODO: 實作邏輯
   * - 解除對帳關聯
   * - 重置狀態為待對帳
   * - 記錄取消原因
   */
  async unmatch(
    bankTransactionId: string,
    reason: string,
    userId: string,
  ) {
    this.logger.log(
      `取消對帳 - 銀行交易: ${bankTransactionId}, 原因: ${reason}, 操作者: ${userId}`,
    );

    // TODO: 實作取消對帳邏輯
    return {
      success: true,
      bankTransactionId,
      reason,
      message: '已取消對帳（模擬）',
    };
  }
}
