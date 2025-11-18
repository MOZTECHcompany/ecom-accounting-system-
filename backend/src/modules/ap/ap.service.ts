import { Injectable } from '@nestjs/common';
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
}
