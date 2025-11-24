import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(ArService.name);

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

  /**
   * 從訂單建立應收發票
   * @param orderId - 訂單ID
   * @returns 建立的應收發票
   */
  async createArFromOrder(orderId: string) {
    this.logger.log(`Creating AR invoice from order: ${orderId}`);
    throw new Error('Not implemented: createArFromOrder');
  }

  /**
   * 套用收款
   * @param invoiceId - 發票ID
   * @param paymentAmount - 收款金額
   * @param paymentDate - 收款日期
   * @returns 更新後的發票資訊
   */
  async applyPayment(
    invoiceId: string,
    paymentAmount: number,
    paymentDate: Date,
  ) {
    this.logger.log(
      `Applying payment of ${paymentAmount} to invoice ${invoiceId}`,
    );
    throw new Error('Not implemented: applyPayment');
  }

  /**
   * 取得帳齡分析報表
   * @param entityId - 實體ID
   * @param asOfDate - 統計基準日期
   * @returns 帳齡分析報表
   */
  async getAgingReport(entityId: string, asOfDate: Date) {
    this.logger.log(
      `Generating aging report for entity ${entityId} as of ${asOfDate}`,
    );
    throw new Error('Not implemented: getAgingReport');
  }

  /**
   * 呆帳沖銷
   * @param invoiceId - 發票ID
   * @param amount - 沖銷金額
   * @param reason - 沖銷原因
   * @returns 沖銷記錄
   */
  async writeOffBadDebt(invoiceId: string, amount: number, reason: string) {
    this.logger.log(
      `Writing off bad debt for invoice ${invoiceId}, amount: ${amount}, reason: ${reason}`,
    );
    throw new Error('Not implemented: writeOffBadDebt');
  }
}
