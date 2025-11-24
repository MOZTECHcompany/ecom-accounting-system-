// @ts-nocheck
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportBankTransactionsDto } from './dto/import-bank-transactions.dto';
import { AutoMatchDto } from './dto/auto-match.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * ReconciliationService
 * 銀行對帳服務（實戰版）
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 匯入銀行交易明細
   */
  async importBankTransactions(dto: ImportBankTransactionsDto, userId: string) {
    this.logger.log(
      `匯入銀行交易 - 來源: ${dto.source}, 筆數: ${dto.transactions.length}`,
    );

    // 建立匯入批次
    const batch = await this.prisma.bankImportBatch.create({
      data: {
        entityId: dto.entityId,
        source: dto.source,
        importedBy: userId,
        fileName: dto.fileName || null,
        recordCount: dto.transactions.length,
        notes: dto.notes || null,
      },
    });

    // 批次寫入銀行交易
    const bankTransactions = dto.transactions.map((tx) => ({
      bankAccountId: dto.bankAccountId,
      batchId: batch.id,
      txnDate: new Date(tx.transactionDate),
      valueDate: new Date(tx.transactionDate),
      amountOriginal: new Decimal(tx.amount),
      amountCurrency: tx.currency || 'TWD',
      amountFxRate: new Decimal(tx.fxRate || 1),
      amountBase: new Decimal(tx.amount).mul(new Decimal(tx.fxRate || 1)),
      descriptionRaw: tx.description,
      referenceNo: tx.referenceNo || null,
      virtualAccountNo: tx.virtualAccount || null,
      reconcileStatus: 'unmatched',
    }));

    await this.prisma.bankTransaction.createMany({
      data: bankTransactions,
    });

    this.logger.log(`匯入完成 - BatchID: ${batch.id}`);

    return {
      success: true,
      batchId: batch.id,
      recordCount: dto.transactions.length,
    };
  }

  /**
   * 自動匹配銀行交易
   */
  async autoMatchTransactions(batchId: string, config?: AutoMatchDto) {
    this.logger.log(`自動對帳 - BatchID: ${batchId}`);

    const dateTolerance = config?.dateTolerance || 1;
    const amountTolerance = config?.amountTolerance || 0;

    // 取得該批次的未匹配交易
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        batchId,
        reconcileStatus: 'unmatched',
      },
    });

    let matchedCount = 0;
    let fuzzyMatchedCount = 0;

    for (const tx of transactions) {
      // 嘗試精準匹配 - 金額相同且日期接近的 Payment
      const exactMatch = await this.prisma.payment.findFirst({
        where: {
          amountOriginal: tx.amountOriginal,
          paymentDate: {
            gte: new Date(
              tx.txnDate.getTime() - dateTolerance * 24 * 60 * 60 * 1000,
            ),
            lte: new Date(
              tx.txnDate.getTime() + dateTolerance * 24 * 60 * 60 * 1000,
            ),
          },
        },
      });

      if (exactMatch) {
        await this.createReconciliationResult(
          tx.id,
          'payment',
          exactMatch.id,
          100,
          'exact_amount',
        );
        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data: {
            reconcileStatus: 'matched',
            matchedType: 'payment',
            matchedId: exactMatch.id,
          },
        });
        matchedCount++;
        continue;
      }

      // 模糊匹配 - 檢查描述是否包含訂單編號
      if (config?.useFuzzyMatch) {
        const orderIdMatch = tx.descriptionRaw.match(/order-[a-z0-9-]+/i);
        if (orderIdMatch) {
          const orderId = orderIdMatch[0];
          const order = await this.prisma.salesOrder.findFirst({
            where: { id: orderId },
          });

          if (order) {
            await this.createReconciliationResult(
              tx.id,
              'sales_order',
              order.id,
              70,
              'keyword',
            );
            await this.prisma.bankTransaction.update({
              where: { id: tx.id },
              data: {
                reconcileStatus: 'matched',
                matchedType: 'sales_order',
                matchedId: order.id,
              },
            });
            fuzzyMatchedCount++;
          }
        }
      }
    }

    this.logger.log(
      `對帳完成 - 精準: ${matchedCount}, 模糊: ${fuzzyMatchedCount}`,
    );

    return {
      success: true,
      totalTransactions: transactions.length,
      exactMatched: matchedCount,
      fuzzyMatched: fuzzyMatchedCount,
      unmatched: transactions.length - matchedCount - fuzzyMatchedCount,
    };
  }

  /**
   * 取得待對帳項目
   */
  async getPendingReconciliation(entityId: string) {
    const pendingTransactions = await this.prisma.bankTransaction.findMany({
      where: {
        bankAccount: {
          entityId,
        },
        reconcileStatus: 'unmatched',
      },
      include: {
        bankAccount: true,
        importBatch: true,
      },
      orderBy: {
        txnDate: 'desc',
      },
      take: 100,
    });

    return pendingTransactions;
  }

  /**
   * 手動對帳
   */
  async manualMatch(
    bankTransactionId: string,
    matchedType: string,
    matchedId: string,
    userId: string,
  ) {
    this.logger.log(
      `手動對帳 - 銀行交易: ${bankTransactionId}, 匹配: ${matchedType}/${matchedId}`,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.createReconciliationResult(
        bankTransactionId,
        matchedType,
        matchedId,
        100,
        'manual',
      );

      await tx.bankTransaction.update({
        where: { id: bankTransactionId },
        data: {
          reconcileStatus: 'matched',
          matchedType,
          matchedId,
        },
      });
    });

    return { success: true };
  }

  /**
   * 取消對帳
   */
  async unmatch(bankTransactionId: string, userId: string) {
    this.logger.log(`取消對帳 - 銀行交易: ${bankTransactionId}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.reconciliationResult.deleteMany({
        where: { bankTransactionId },
      });

      await tx.bankTransaction.update({
        where: { id: bankTransactionId },
        data: {
          reconcileStatus: 'unmatched',
          matchedType: null,
          matchedId: null,
        },
      });
    });

    return { success: true };
  }

  /**
   * 建立對帳結果記錄
   */
  private async createReconciliationResult(
    bankTransactionId: string,
    matchedType: string,
    matchedId: string,
    confidence: number,
    ruleUsed: string,
  ) {
    await this.prisma.reconciliationResult.create({
      data: {
        bankTransactionId,
        matchedType,
        matchedId,
        confidence,
        ruleUsed,
      },
    });
  }
}
