// @ts-nocheck
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportBankTransactionsDto } from './dto/import-bank-transactions.dto';
import { AutoMatchDto } from './dto/auto-match.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { ArService } from '../ar/ar.service';
import { ReportsService } from '../reports/reports.service';

/**
 * ReconciliationService
 * 銀行對帳服務（實戰版）
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly arService: ArService,
    private readonly reportsService: ReportsService,
  ) {}

  async getReconciliationCenter(
    entityId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
  ) {
    const normalizedLimit = Math.min(Math.max(Number(limit || 300), 20), 500);
    const [receivables, audit] = await Promise.all([
      this.arService.getReceivableMonitor(entityId, undefined, startDate, endDate),
      this.reportsService.getOrderReconciliationAudit(
        entityId,
        startDate,
        endDate,
        normalizedLimit,
      ),
    ]);

    const auditMap = new Map(
      (audit.items || []).map((item) => [item.orderId, item]),
    );
    const items = (receivables.items || []).map((item) =>
      this.classifyReconciliationQueueItem(item, auditMap.get(item.orderId)),
    );

    const buckets = {
      pending_payout: this.emptyCenterBucket('pending_payout', '待撥款'),
      ready_to_clear: this.emptyCenterBucket('ready_to_clear', '可核銷'),
      cleared: this.emptyCenterBucket('cleared', '已核銷'),
      exceptions: this.emptyCenterBucket('exceptions', '異常'),
    };

    for (const item of items) {
      const bucket = buckets[item.bucket] || buckets.exceptions;
      bucket.count += 1;
      bucket.grossAmount += item.grossAmount;
      bucket.paidAmount += item.paidAmount;
      bucket.netAmount += item.netAmount;
      bucket.outstandingAmount += item.outstandingAmount;
      bucket.feeTotal += item.feeTotal;
      bucket.items.push(item);
    }

    const totalCount = items.length;
    const clearedCount = buckets.cleared.count;
    const summary = {
      totalCount,
      pendingPayoutCount: buckets.pending_payout.count,
      readyToClearCount: buckets.ready_to_clear.count,
      clearedCount,
      exceptionCount: buckets.exceptions.count,
      grossAmount: this.sumCenterItems(items, 'grossAmount'),
      paidAmount: this.sumCenterItems(items, 'paidAmount'),
      netAmount: this.sumCenterItems(items, 'netAmount'),
      outstandingAmount: this.sumCenterItems(items, 'outstandingAmount'),
      pendingPayoutAmount: buckets.pending_payout.outstandingAmount,
      exceptionAmount: buckets.exceptions.outstandingAmount,
      feeTotal: this.sumCenterItems(items, 'feeTotal'),
      completionRate: totalCount ? Math.round((clearedCount / totalCount) * 100) : 0,
      lastGeneratedAt: new Date().toISOString(),
    };

    const priorityItems = items
      .filter((item) => item.bucket === 'exceptions')
      .sort((left, right) => {
        const severityScore = { critical: 3, warning: 2, healthy: 1 };
        return (
          (severityScore[right.severity] || 0) -
            (severityScore[left.severity] || 0) ||
          right.outstandingAmount - left.outstandingAmount
        );
      })
      .slice(0, 12);

    return {
      entityId,
      range: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
      summary,
      buckets,
      priorityItems,
      rules: [
        {
          key: 'orders-create-ar',
          label: '訂單先形成應收',
          description: '平台訂單代表應收，不代表現金已入帳。',
        },
        {
          key: 'ecpay-payout-final-cash',
          label: '綠界撥款才是實收依據',
          description:
            '信用卡、超商取貨付款、貨到付款都要等撥款資料回填後才能確認淨入帳。',
        },
        {
          key: 'fee-invoice-close-loop',
          label: '手續費與發票要閉環',
          description:
            '每筆撥款需核對金流手續費、平台費、物流費與發票狀態，完整後才能核銷。',
        },
      ],
    };
  }

  private emptyCenterBucket(key: string, label: string) {
    return {
      key,
      label,
      count: 0,
      grossAmount: 0,
      paidAmount: 0,
      netAmount: 0,
      outstandingAmount: 0,
      feeTotal: 0,
      items: [],
    };
  }

  private classifyReconciliationQueueItem(item: any, auditItem?: any) {
    const hasException =
      auditItem?.severity === 'critical' ||
      auditItem?.severity === 'warning' ||
      (item.warningCodes || []).some((code) =>
        [
          'missing_fee',
          'missing_journal',
          'invoice_pending',
          'invoice_issued_unposted',
          'invoice_issued_unpaid',
          'overdue_receivable',
        ].includes(code),
      );

    let bucket = 'pending_payout';
    let reason = item.settlementDiagnostic || '等待綠界或平台撥款資料回填。';
    let nextAction = '等待下一次自動同步，或手動匯入綠界撥款資料。';

    if (
      item.reconciledFlag &&
      item.accountingPosted &&
      item.invoiceNumber &&
      item.feeStatus === 'actual' &&
      Number(item.outstandingAmount || 0) <= 0
    ) {
      bucket = 'cleared';
      reason = '訂單、撥款、手續費、發票與分錄已對齊。';
      nextAction = '不需處理。';
    } else if (hasException) {
      bucket = 'exceptions';
      reason =
        auditItem?.anomalyMessages?.[0] ||
        (item.warningCodes || []).join('、') ||
        '這筆訂單有資料缺口，需要人工確認。';
      nextAction =
        auditItem?.recommendation ||
        '先補綠界撥款/手續費或發票狀態，再重新同步。';
    } else if (Number(item.paidAmount || 0) > 0 || item.reconciledFlag) {
      bucket = 'ready_to_clear';
      reason = '已看到收款或撥款資料，可以進入核銷檢查。';
      nextAction = '確認手續費、發票與分錄後核銷。';
    }

    return {
      key: item.orderId,
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      customerName: item.customerName,
      sourceLabel: item.sourceLabel,
      sourceBrand: item.sourceBrand,
      channelCode: item.channelCode,
      orderDate: item.orderDate,
      dueDate: item.dueDate,
      bucket,
      bucketLabel:
        bucket === 'pending_payout'
          ? '待撥款'
          : bucket === 'ready_to_clear'
            ? '可核銷'
            : bucket === 'cleared'
              ? '已核銷'
              : '異常',
      grossAmount: Number(item.grossAmount || 0),
      paidAmount: Number(item.paidAmount || 0),
      netAmount: Number(item.netAmount || 0),
      feeTotal: Number(item.feeTotal || 0),
      gatewayFeeAmount: Number(item.gatewayFeeAmount || 0),
      platformFeeAmount: Number(item.platformFeeAmount || 0),
      outstandingAmount: Number(item.outstandingAmount || 0),
      invoiceNumber: item.invoiceNumber || null,
      invoiceStatus: item.invoiceStatus || null,
      feeStatus: item.feeStatus || 'unavailable',
      feeSource: item.feeSource || null,
      reconciledFlag: Boolean(item.reconciledFlag),
      accountingPosted: Boolean(item.accountingPosted),
      settlementPhase: item.settlementPhase || null,
      settlementPhaseLabel: item.settlementPhaseLabel || null,
      collectionOwnerLabel: item.collectionOwnerLabel || null,
      severity: bucket === 'exceptions' ? auditItem?.severity || 'warning' : 'healthy',
      reason,
      nextAction,
      anomalyCodes: auditItem?.anomalyCodes || item.warningCodes || [],
      anomalyMessages: auditItem?.anomalyMessages || [],
      providerTradeNo: auditItem?.providerTradeNo || null,
      providerPaymentId: auditItem?.providerPaymentId || null,
    };
  }

  private sumCenterItems(items: any[], field: string) {
    return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
  }

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
