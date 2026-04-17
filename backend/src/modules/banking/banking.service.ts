import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { BankingRepository } from './banking.repository';
import { PrismaService } from '../../common/prisma/prisma.service';

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
  constructor(
    private readonly bankingRepository: BankingRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 查詢銀行帳戶列表
   */
  async getBankAccounts(entityId: string) {
    return this.bankingRepository.findBankAccounts(entityId);
  }

  async getBankAccount(id: string) {
    const account = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: {
        bankTransactions: {
          orderBy: { txnDate: 'desc' },
          take: 20,
        },
        virtualAccounts: {
          orderBy: { virtualAccountNo: 'asc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Bank account ${id} not found`);
    }

    return account;
  }

  /**
   * 建立銀行帳戶
   */
  async createBankAccount(data: any) {
    return this.bankingRepository.createBankAccount({
      entityId: data.entityId,
      bankName: data.bankName,
      branch: data.branch || null,
      accountNo: data.accountNo,
      currency: data.currency || 'TWD',
      isVirtualSupport: Boolean(data.isVirtualSupport),
      metaJson: data.metaJson || null,
      isActive: data.isActive ?? true,
    });
  }

  /**
   * 查詢銀行交易
   */
  async getBankTransactions(
    bankAccountId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.prisma.bankTransaction.findMany({
      where: {
        ...(bankAccountId && { bankAccountId }),
        ...(startDate || endDate
          ? {
              txnDate: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      include: {
        bankAccount: true,
      },
      orderBy: { txnDate: 'desc' },
    });
  }

  async createBankTransaction(data: any) {
    const amountOriginal = Number(data.amountOriginal || 0);
    const amountFxRate = Number(data.amountFxRate || 1);

    return this.bankingRepository.createBankTransaction({
      bankAccountId: data.bankAccountId,
      txnDate: new Date(data.txnDate || new Date()),
      valueDate: new Date(data.valueDate || data.txnDate || new Date()),
      amountOriginal: new Decimal(amountOriginal),
      amountCurrency: data.amountCurrency || 'TWD',
      amountFxRate: new Decimal(amountFxRate),
      amountBase: new Decimal(
        Number(data.amountBase || (amountOriginal * amountFxRate).toFixed(2)),
      ),
      descriptionRaw: data.descriptionRaw || '',
      referenceNo: data.referenceNo || null,
      virtualAccountNo: data.virtualAccountNo || null,
      batchId: data.batchId || null,
      matchedType: data.matchedType || null,
      matchedId: data.matchedId || null,
      reconcileStatus: data.reconcileStatus || 'unmatched',
    });
  }

  async updateReconciliation(bankTransactionId: string, data: any) {
    return this.prisma.bankTransaction.update({
      where: { id: bankTransactionId },
      data: {
        matchedType: data.matchedType || null,
        matchedId: data.matchedId || null,
        reconcileStatus: data.reconcileStatus || 'matched',
      },
    });
  }

  async getAccountBalance(id: string) {
    const account = await this.getBankAccount(id);
    const aggregate = await this.prisma.bankTransaction.aggregate({
      where: { bankAccountId: id },
      _sum: { amountOriginal: true, amountBase: true },
    });

    const reconciled = await this.prisma.bankTransaction.aggregate({
      where: { bankAccountId: id, reconcileStatus: 'matched' },
      _sum: { amountOriginal: true, amountBase: true },
    });

    return {
      account: {
        id: account.id,
        bankName: account.bankName,
        branch: account.branch,
        accountNo: account.accountNo,
        currency: account.currency,
      },
      balanceOriginal: Number(aggregate._sum.amountOriginal || 0),
      balanceBase: Number(aggregate._sum.amountBase || 0),
      reconciledOriginal: Number(reconciled._sum.amountOriginal || 0),
      reconciledBase: Number(reconciled._sum.amountBase || 0),
      unreconciledCount: account.bankTransactions.filter(
        (txn) => txn.reconcileStatus !== 'matched',
      ).length,
    };
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
