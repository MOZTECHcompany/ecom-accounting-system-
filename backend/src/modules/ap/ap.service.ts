import { Injectable, Logger } from '@nestjs/common';
import { ApRepository } from './ap.repository';

/**
 * 應付帳款服務
 *
 * 核心功能：
 * 1. AP 發票管理
 * 2. 付款記錄
 * 3. 到期應付款報表
 * 4. 付款排程
 */
@Injectable()
export class ApService {
  private readonly logger = new Logger(ApService.name);

  constructor(private readonly apRepository: ApRepository) {}

  async getInvoices(entityId?: string) {
    return this.apRepository.findInvoices(entityId);
  }

  /**
   * 建立AP發票
   * TODO: 產生分錄（借：進貨或費用 / 貸：應付帳款）
   */
  async createInvoice(data: any) {
    return this.apRepository.createInvoice(data);
  }

  /**
   * 記錄付款
   * TODO: 產生分錄（借：應付帳款 / 貸：銀行存款）
   */
  async recordPayment(invoiceId: string, data: any) {
    return this.apRepository.recordPayment(invoiceId, data);
  }

  /**
   * 到期應付款報表
   * 依到期日分組統計
   */
  async getDuePayablesReport(entityId: string) {
    // TODO: 依 due_date 分組
    return {
      entityId,
      asOfDate: new Date(),
      buckets: [
        { label: '已逾期', amount: 0 },
        { label: '7天內到期', amount: 0 },
        { label: '30天內到期', amount: 0 },
        { label: '30天後到期', amount: 0 },
      ],
      totalAp: 0,
    };
  }

  /**
   * 批次付款
   */
  async batchPayment(invoiceIds: string[], paymentDate: Date) {
    // TODO: 批次產生付款記錄與分錄
  }

  /**
   * 付款排程
   */
  async schedulePayment(invoiceId: string, scheduledDate: Date) {
    // TODO: 設定付款排程
  }

  /**
   * 從費用申請建立應付發票
   * @param expenseRequestId - 費用申請ID
   * @returns 建立的應付發票
   */
  async createApFromExpenseRequest(expenseRequestId: string) {
    this.logger.log(
      `Creating AP invoice from expense request: ${expenseRequestId}`,
    );
    throw new Error('Not implemented: createApFromExpenseRequest');
  }

  /**
   * 標記為已付款
   * @param invoiceId - 發票ID
   * @param paymentDate - 付款日期
   * @param bankAccountId - 銀行帳戶ID
   * @returns 更新後的發票資訊
   */
  async markAsPaid(
    invoiceId: string,
    paymentDate: Date,
    bankAccountId: string,
  ) {
    this.logger.log(
      `Marking invoice ${invoiceId} as paid, payment date: ${paymentDate}`,
    );
    throw new Error('Not implemented: markAsPaid');
  }

  /**
   * 取得到期報表
   * @param entityId - 實體ID
   * @param asOfDate - 統計基準日期
   * @returns 到期報表
   */
  async getDueReport(entityId: string, asOfDate: Date) {
    this.logger.log(
      `Generating due report for entity ${entityId} as of ${asOfDate}`,
    );
    throw new Error('Not implemented: getDueReport');
  }

  /**
   * 套用折扣
   * @param invoiceId - 發票ID
   * @param discountAmount - 折扣金額
   * @returns 更新後的發票資訊
   */
  async applyDiscount(invoiceId: string, discountAmount: number) {
    this.logger.log(
      `Applying discount of ${discountAmount} to invoice ${invoiceId}`,
    );
    throw new Error('Not implemented: applyDiscount');
  }
}
