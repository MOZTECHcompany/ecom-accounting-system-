import { Injectable } from '@nestjs/common';

/**
 * 銀行管理服務
 *
 * 核心功能：
 * 1. 銀行帳戶管理
 * 2. 虛擬帳號管理
 * 3. 銀行對帳（Bank Reconciliation）
 * 4. 銀行交易匯入
 */
@Injectable()
export class BankingService {
  /**
   * 查詢銀行帳戶列表
   */
  async getBankAccounts(entityId: string) {
    // TODO: 查詢銀行帳戶
  }

  /**
   * 建立銀行帳戶
   */
  async createBankAccount(data: any) {
    // TODO: 建立銀行帳戶
  }

  /**
   * 查詢銀行交易
   */
  async getBankTransactions(
    bankAccountId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // TODO: 查詢銀行交易流水
  }

  /**
   * 匯入銀行對帳單（CSV）
   */
  async importBankStatement(bankAccountId: string, csvFile: Buffer) {
    // TODO: 解析CSV檔案
    // TODO: 批次建立 BankTransaction
    // TODO: 自動對帳匹配
  }

  /**
   * 自動對帳匹配
   * 將銀行交易與系統內的 Payment/Receipt 自動配對
   */
  async autoReconcile(bankAccountId: string, transactionDate: Date) {
    // TODO: 依金額、日期、摘要自動配對
    // TODO: 標記已配對的交易
  }

  /**
   * 手動對帳
   */
  async manualReconcile(bankTransactionId: string, paymentId: string) {
    // TODO: 手動關聯銀行交易與付款/收款記錄
  }

  /**
   * 產生對帳報表
   */
  async getReconciliationReport(bankAccountId: string, asOfDate: Date) {
    // TODO: 比較帳面餘額與銀行餘額
    // TODO: 列出未對帳項目
  }

  /**
   * 虛擬帳號管理
   */
  async createVirtualAccount(data: {
    bankAccountId: string;
    customerId: string;
    virtualAccountNumber: string;
  }) {
    // TODO: 建立虛擬帳號
  }

  /**
   * 虛擬帳號收款自動對帳
   */
  async matchVirtualAccountPayment(
    virtualAccountNumber: string,
    amount: number,
  ) {
    // TODO: 依虛擬帳號自動對應客戶與訂單
    // TODO: 自動標記訂單為已付款
  }
}
