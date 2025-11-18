import { Injectable } from '@nestjs/common';
import { ArRepository } from './ar.repository';

/**
 * 應收帳款服務
 * 
 * 核心功能：
 * 1. AR 發票管理
 * 2. 收款記錄
 * 3. 帳齡分析
 * 4. 呆帳備抵與壞帳處理
 * 5. 催收管理
 */
@Injectable()
export class ArService {
  constructor(private readonly arRepository: ArRepository) {}

  /**
   * 查詢AR發票列表
   */
  async getInvoices(entityId?: string, status?: string) {
    return this.arRepository.findInvoices({ entityId, status });
  }

  /**
   * 查詢單一AR發票
   */
  async getInvoice(id: string) {
    return this.arRepository.findInvoiceById(id);
  }

  /**
   * 建立AR發票
   * TODO: 自動產生會計分錄（借：應收帳款 / 貸：銷貨收入）
   */
  async createInvoice(data: any) {
    // TODO: 驗證資料
    // TODO: 計算金額
    // TODO: 呼叫 AccountingService.createJournalEntry()
    return this.arRepository.createInvoice(data);
  }

  /**
   * 記錄收款
   * TODO: 產生收款分錄（借：銀行存款 / 貸：應收帳款）
   */
  async recordPayment(invoiceId: string, data: any) {
    // TODO: 更新AR發票的 paid_amount
    // TODO: 檢查是否已全部收清（status = PAID）
    // TODO: 產生會計分錄
    return this.arRepository.recordPayment(invoiceId, data);
  }

  /**
   * 產生AR帳齡分析表
   * 分組: 未逾期 / 1-30天 / 31-60天 / 61-90天 / 90天以上
   */
  async getAgingReport(entityId: string) {
    // TODO: 依 due_date 計算逾期天數
    // TODO: 分組統計
    // TODO: 計算總應收金額
    return {
      entityId,
      asOfDate: new Date(),
      buckets: [
        { label: '未逾期', amount: 0, count: 0 },
        { label: '1-30天', amount: 0, count: 0 },
        { label: '31-60天', amount: 0, count: 0 },
        { label: '61-90天', amount: 0, count: 0 },
        { label: '90天以上', amount: 0, count: 0 },
      ],
      totalAr: 0,
    };
  }

  /**
   * 呆帳沖銷
   * TODO: 產生壞帳費用分錄（借：壞帳費用 / 貸：應收帳款）
   */
  async writeOffBadDebt(invoiceId: string, data: any) {
    // TODO: 標記為壞帳
    // TODO: 產生壞帳費用會計分錄
    return this.arRepository.writeOffInvoice(invoiceId);
  }

  /**
   * 提列呆帳備抵
   * 依帳齡或歷史壞帳率提列
   */
  async createAllowanceForDoubtfulAccounts(entityId: string, amount: number) {
    // TODO: 產生分錄（借：呆帳費用 / 貸：備抵呆帳）
  }

  /**
   * 催收管理
   * TODO: 自動發送催收通知
   */
  async sendCollectionReminder(invoiceId: string) {
    // TODO: 發送 Email 或簡訊提醒
    // TODO: 記錄催收歷史
  }
}
