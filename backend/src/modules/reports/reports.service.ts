import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * 報表服務
 *
 * 核心功能：
 * 1. 財務報表（損益表、資產負債表、現金流量表、權益變動表）
 * 2. 管理報表（銷售分析、成本分析、費用分析）
 * 3. 自訂報表
 * 4. 報表匯出（Excel, PDF）
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getDashboardSalesOverview(
    entityId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const stores = this.getOneShopStores();
    const buckets = this.buildDashboardBuckets(stores);

    const bucketMap = new Map(
      buckets.map((bucket) => [
        bucket.key,
        {
          ...bucket,
          gross: 0,
          orderCount: 0,
          payoutGross: 0,
          payoutNet: 0,
          feeTotal: 0,
          paymentCount: 0,
          reconciledCount: 0,
          pendingPayoutCount: 0,
        },
      ]),
    );

    const orderDateFilter = this.buildDateFilter(startDate, endDate);
    const paymentDateFilter = this.buildDateFilter(startDate, endDate);

    const [orders, payments] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: {
          entityId,
          ...(orderDateFilter ? { orderDate: orderDateFilter } : {}),
        },
        select: {
          id: true,
          notes: true,
          totalGrossOriginal: true,
          channel: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          entityId,
          ...(paymentDateFilter ? { payoutDate: paymentDateFilter } : {}),
        },
        select: {
          id: true,
          channel: true,
          notes: true,
          amountGrossOriginal: true,
          amountNetOriginal: true,
          feePlatformOriginal: true,
          feeGatewayOriginal: true,
          reconciledFlag: true,
          salesOrder: {
            select: {
              notes: true,
              channel: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      }),
    ]);

    for (const order of orders) {
      const bucketKey = this.resolvePerformanceBucket({
        channelCode: order.channel?.code,
        notes: order.notes,
        stores,
      });
      const bucket = bucketMap.get(bucketKey) || bucketMap.get('other');
      if (!bucket) {
        continue;
      }
      bucket.gross += Number(order.totalGrossOriginal || 0);
      bucket.orderCount += 1;
    }

    for (const payment of payments) {
      const bucketKey = this.resolvePerformanceBucket({
        channelCode: payment.salesOrder?.channel?.code || payment.channel,
        notes: payment.salesOrder?.notes || payment.notes,
        fallbackNotes: payment.notes,
        stores,
      });
      const bucket = bucketMap.get(bucketKey) || bucketMap.get('other');
      if (!bucket) {
        continue;
      }

      bucket.payoutGross += Number(payment.amountGrossOriginal || 0);
      bucket.payoutNet += Number(payment.amountNetOriginal || 0);
      bucket.feeTotal +=
        Number(payment.feePlatformOriginal || 0) +
        Number(payment.feeGatewayOriginal || 0);
      bucket.paymentCount += 1;
      if (payment.reconciledFlag) {
        bucket.reconciledCount += 1;
      } else {
        bucket.pendingPayoutCount += 1;
      }
    }

    const bucketItems = Array.from(bucketMap.values());
    const total = bucketItems.reduce(
      (acc, bucket) => ({
        key: 'total',
        label: '總業績',
        gross: acc.gross + bucket.gross,
        orderCount: acc.orderCount + bucket.orderCount,
        payoutGross: acc.payoutGross + bucket.payoutGross,
        payoutNet: acc.payoutNet + bucket.payoutNet,
        feeTotal: acc.feeTotal + bucket.feeTotal,
        paymentCount: acc.paymentCount + bucket.paymentCount,
        reconciledCount: acc.reconciledCount + bucket.reconciledCount,
        pendingPayoutCount: acc.pendingPayoutCount + bucket.pendingPayoutCount,
      }),
      {
        key: 'total',
        label: '總業績',
        gross: 0,
        orderCount: 0,
        payoutGross: 0,
        payoutNet: 0,
        feeTotal: 0,
        paymentCount: 0,
        reconciledCount: 0,
        pendingPayoutCount: 0,
      },
    );

    return {
      entityId,
      range: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
      buckets: bucketItems,
      total,
    };
  }

  async getDashboardExecutiveOverview(
    entityId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const orderDateFilter = this.buildDateFilter(startDate, endDate);
    const expenseDateFilter = this.buildDateFilter(startDate, endDate);
    const inventoryAlertThreshold = Number(
      this.configService.get<string>('DASHBOARD_INVENTORY_ALERT_THRESHOLD', '5'),
    );

    const [
      expenseAgg,
      fallbackPaidExpenseAgg,
      pendingExpenseAgg,
      approvedExpenseAgg,
      pendingPayoutCount,
      uninvoicedOrdersCount,
      inventorySnapshots,
    ] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          entityId,
          ...(expenseDateFilter ? { expenseDate: expenseDateFilter } : {}),
        },
        _sum: {
          totalAmountOriginal: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.expenseRequest.aggregate({
        where: {
          entityId,
          paymentStatus: 'paid',
          ...(expenseDateFilter ? { updatedAt: expenseDateFilter } : {}),
        },
        _sum: {
          amountOriginal: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.expenseRequest.aggregate({
        where: {
          entityId,
          status: 'pending',
          ...(expenseDateFilter ? { createdAt: expenseDateFilter } : {}),
        },
        _sum: {
          amountOriginal: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.expenseRequest.aggregate({
        where: {
          entityId,
          status: 'approved',
          paymentStatus: {
            not: 'paid',
          },
          ...(expenseDateFilter ? { approvedAt: expenseDateFilter } : {}),
        },
        _sum: {
          amountOriginal: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          entityId,
          reconciledFlag: false,
          status: {
            in: ['completed', 'success', 'pending'],
          },
        },
      }),
      this.prisma.salesOrder.count({
        where: {
          entityId,
          hasInvoice: false,
          status: {
            notIn: ['cancelled', 'refunded'],
          },
          ...(orderDateFilter ? { orderDate: orderDateFilter } : {}),
        },
      }),
      this.prisma.inventorySnapshot.findMany({
        where: {
          entityId,
        },
        select: {
          productId: true,
          qtyAvailable: true,
          qtyOnHand: true,
          product: {
            select: {
              sku: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const actualSpend =
      Number(expenseAgg._sum.totalAmountOriginal || 0) ||
      Number(fallbackPaidExpenseAgg._sum.amountOriginal || 0);
    const actualSpendCount =
      Number(expenseAgg._count.id || 0) ||
      Number(fallbackPaidExpenseAgg._count.id || 0);
    const pendingExpenseAmount = Number(pendingExpenseAgg._sum.amountOriginal || 0);
    const pendingExpenseCount = Number(pendingExpenseAgg._count.id || 0);
    const approvedExpenseAmount = Number(
      approvedExpenseAgg._sum.amountOriginal || 0,
    );
    const approvedExpenseCount = Number(approvedExpenseAgg._count.id || 0);

    const inventoryByProduct = new Map<
      string,
      { sku: string; name: string; qtyAvailable: number; qtyOnHand: number }
    >();

    for (const snapshot of inventorySnapshots) {
      const current = inventoryByProduct.get(snapshot.productId) || {
        sku: snapshot.product.sku,
        name: snapshot.product.name,
        qtyAvailable: 0,
        qtyOnHand: 0,
      };

      current.qtyAvailable += Number(snapshot.qtyAvailable || 0);
      current.qtyOnHand += Number(snapshot.qtyOnHand || 0);
      inventoryByProduct.set(snapshot.productId, current);
    }

    const inventoryRows = Array.from(inventoryByProduct.values());
    const outOfStockItems = inventoryRows.filter((item) => item.qtyAvailable <= 0);
    const lowStockItems = inventoryRows
      .filter(
        (item) =>
          item.qtyAvailable > 0 && item.qtyAvailable <= inventoryAlertThreshold,
      )
      .sort((a, b) => a.qtyAvailable - b.qtyAvailable);

    const topAlerts = [...outOfStockItems, ...lowStockItems].slice(0, 6);

    return {
      entityId,
      range: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
      expenses: {
        actualSpend,
        actualSpendCount,
        pendingApprovalAmount: pendingExpenseAmount,
        pendingApprovalCount: pendingExpenseCount,
        approvedUnpaidAmount: approvedExpenseAmount,
        approvedUnpaidCount: approvedExpenseCount,
      },
      operations: {
        pendingPayoutCount,
        uninvoicedOrdersCount,
        inventoryAlertCount: topAlerts.length,
        outOfStockCount: outOfStockItems.length,
      },
      inventoryAlerts: topAlerts.map((item) => ({
        sku: item.sku,
        name: item.name,
        qtyAvailable: item.qtyAvailable,
        qtyOnHand: item.qtyOnHand,
        severity: item.qtyAvailable <= 0 ? 'critical' : 'warning',
      })),
      tasks: [
        {
          key: 'pending-payout',
          title: '待撥款與待對帳款項',
          value: pendingPayoutCount,
          amount: null,
          tone: pendingPayoutCount > 0 ? 'warning' : 'healthy',
          helper: '消費者可能已付款，但金流尚未正式撥款或未回填對帳結果。',
        },
        {
          key: 'pending-expense-approval',
          title: '待審核費用申請',
          value: pendingExpenseCount,
          amount: pendingExpenseAmount,
          tone: pendingExpenseCount > 0 ? 'warning' : 'healthy',
          helper: '有待主管或財務核准的支出，會影響當期費用掌握。',
        },
        {
          key: 'approved-expense-payment',
          title: '已核准但尚未付款',
          value: approvedExpenseCount,
          amount: approvedExpenseAmount,
          tone: approvedExpenseCount > 0 ? 'attention' : 'healthy',
          helper: '這些費用已核准，但尚未真正出款。',
        },
        {
          key: 'uninvoiced-orders',
          title: '待開立發票訂單',
          value: uninvoicedOrdersCount,
          amount: null,
          tone: uninvoicedOrdersCount > 0 ? 'attention' : 'healthy',
          helper: '已成交訂單但尚未完成發票流程，會影響帳務完整性。',
        },
        {
          key: 'inventory-alerts',
          title: '庫存警示商品',
          value: topAlerts.length,
          amount: null,
          tone: topAlerts.length > 0 ? 'critical' : 'healthy',
          helper: '低庫存或缺貨商品需要優先追補，避免影響銷售。',
        },
      ],
    };
  }

  async getDashboardReconciliationFeed(
    entityId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 12,
  ) {
    const stores = this.getOneShopStores();
    const buckets = this.buildDashboardBuckets(stores);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    const paymentDateFilter = this.buildDateFilter(startDate, endDate);
    const normalizedLimit = Math.min(Math.max(Math.floor(limit || 12), 5), 30);

    const [payments, payoutBatches] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          entityId,
          ...(paymentDateFilter ? { payoutDate: paymentDateFilter } : {}),
        },
        orderBy: {
          payoutDate: 'desc',
        },
        take: normalizedLimit,
        select: {
          id: true,
          salesOrderId: true,
          channel: true,
          payoutDate: true,
          amountGrossOriginal: true,
          amountNetOriginal: true,
          feePlatformOriginal: true,
          feeGatewayOriginal: true,
          reconciledFlag: true,
          status: true,
          notes: true,
          salesOrder: {
            select: {
              externalOrderId: true,
              orderDate: true,
              status: true,
              notes: true,
              channel: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payoutImportBatch.findMany({
        where: {
          entityId,
        },
        orderBy: {
          importedAt: 'desc',
        },
        take: 6,
        select: {
          id: true,
          provider: true,
          sourceType: true,
          importedAt: true,
          fileName: true,
          recordCount: true,
          matchedCount: true,
          unmatchedCount: true,
          invalidCount: true,
          notes: true,
        },
      }),
    ]);

    const recentItems = payments.map((payment) => {
      const notes = payment.salesOrder?.notes || payment.notes;
      const fallbackNotes = payment.notes;
      const bucketKey = this.resolvePerformanceBucket({
        channelCode: payment.salesOrder?.channel?.code || payment.channel,
        notes,
        fallbackNotes,
        stores,
      });
      const bucket = bucketMap.get(bucketKey) || bucketMap.get('other');
      const metadata = {
        ...this.extractMetadata(payment.notes),
        ...this.extractMetadata(payment.salesOrder?.notes),
      };
      const feeTotal =
        Number(payment.feePlatformOriginal || 0) +
        Number(payment.feeGatewayOriginal || 0);

      return {
        paymentId: payment.id,
        salesOrderId: payment.salesOrderId,
        externalOrderId: payment.salesOrder?.externalOrderId || null,
        orderDate: payment.salesOrder?.orderDate?.toISOString() || null,
        payoutDate: payment.payoutDate?.toISOString() || null,
        channelCode: payment.salesOrder?.channel?.code || payment.channel || null,
        bucketKey,
        bucketLabel: bucket?.label || '其他業績',
        account: bucketKey.startsWith('oneshop:')
          ? bucketKey.replace('oneshop:', '')
          : null,
        storeName:
          stores.find((store) => `oneshop:${store.account}` === bucketKey)
            ?.storeName || null,
        orderStatus: payment.salesOrder?.status || null,
        paymentStatus: metadata.paymentStatus || payment.status || null,
        logisticStatus: metadata.logisticStatus || null,
        gateway: metadata.gateway || null,
        feeStatus: metadata.feeStatus || 'unavailable',
        feeSource: metadata.feeSource || null,
        settlementStatus: this.resolveSettlementStatus({
          reconciledFlag: payment.reconciledFlag,
          paymentStatus: metadata.paymentStatus || payment.status,
          rawStatus: payment.status,
        }),
        provider: this.resolveProviderSource(metadata.feeSource),
        providerPaymentId: metadata.providerPaymentId || null,
        providerTradeNo: metadata.providerTradeNo || null,
        gross: Number(payment.amountGrossOriginal || 0),
        feeTotal,
        net: Number(payment.amountNetOriginal || 0),
        reconciledFlag: payment.reconciledFlag,
      };
    });

    return {
      entityId,
      range: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
      recentItems,
      recentBatches: payoutBatches.map((batch) => ({
        id: batch.id,
        provider: batch.provider,
        sourceType: batch.sourceType,
        importedAt: batch.importedAt.toISOString(),
        fileName: batch.fileName || null,
        recordCount: batch.recordCount,
        matchedCount: batch.matchedCount,
        unmatchedCount: batch.unmatchedCount,
        invalidCount: batch.invalidCount,
        notes: batch.notes || null,
      })),
    };
  }

  /**
   * 損益表 (Income Statement / P&L)
   * 已在 AccountingModule 實作，這裡提供增強版
   */
  async getIncomeStatement(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 呼叫 AccountingService.getIncomeStatement
    // TODO: 增加比較期間功能
    // TODO: 增加預算比較
  }

  /**
   * 資產負債表 (Balance Sheet)
   */
  async getBalanceSheet(entityId: string, asOfDate: Date) {
    // TODO: 呼叫 AccountingService.getBalanceSheet
  }

  /**
   * 現金流量表 (Cash Flow Statement)
   */
  async getCashFlowStatement(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 分類：營運活動、投資活動、融資活動
  }

  /**
   * 權益變動表 (Statement of Changes in Equity)
   */
  async getEquityStatement(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 追蹤股本、保留盈餘變動
  }

  /**
   * 銷售分析報表
   */
  async getSalesAnalysis(
    entityId: string,
    groupBy: 'channel' | 'product' | 'customer',
    period: { start: Date; end: Date },
  ) {
    // TODO: 依渠道、商品、客戶分組分析銷售
  }

  /**
   * 成本分析報表
   */
  async getCostAnalysis(entityId: string, period: { start: Date; end: Date }) {
    // TODO: 分析各類成本占比
  }

  /**
   * 費用分析報表
   */
  async getExpenseAnalysis(
    entityId: string,
    groupBy: 'category' | 'department',
    period: { start: Date; end: Date },
  ) {
    // TODO: 依類別或部門分析費用
  }

  /**
   * 毛利分析
   */
  async getGrossMarginAnalysis(
    entityId: string,
    groupBy: 'product' | 'channel',
    period: { start: Date; end: Date },
  ) {
    // TODO: 計算各商品或渠道的毛利率
  }

  /**
   * 庫存報表
   */
  async getInventoryReport(entityId: string, asOfDate: Date) {
    // TODO: 列出所有庫存及其成本
  }

  /**
   * 自訂報表查詢
   */
  async executeCustomQuery(sql: string, params: any[]) {
    // TODO: 執行自訂SQL查詢（需權限控制）
  }

  /**
   * 匯出報表為Excel
   */
  async exportToExcel(reportType: string, data: any) {
    // TODO: 使用 xlsx 套件匯出
  }

  /**
   * 匯出報表為PDF
   */
  async exportToPDF(reportType: string, data: any) {
    // TODO: 使用 pdfkit 或 puppeteer 產生PDF
  }

  private buildDateFilter(startDate?: Date, endDate?: Date) {
    const filter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      filter.gte = startDate;
    }
    if (endDate) {
      filter.lte = endDate;
    }
    return Object.keys(filter).length ? filter : null;
  }

  private buildDashboardBuckets(
    stores: Array<{ account: string; storeName?: string }>,
  ) {
    return [
      {
        key: 'shopify',
        label: 'Shopify 官網業績',
      },
      ...stores.slice(0, 2).map((store, index) => ({
        key: `oneshop:${store.account}`,
        label: store.storeName || `1shop 帳號 ${index + 1}`,
        account: store.account,
        storeName: store.storeName || null,
      })),
      {
        key: 'other',
        label: '其他業績',
      },
    ];
  }

  private getOneShopStores() {
    const storesJson =
      this.configService.get<string>('ONESHOP_STORES_JSON', '') || '';

    if (!storesJson.trim()) {
      return [] as Array<{ account: string; storeName?: string }>;
    }

    try {
      const parsed = JSON.parse(storesJson);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((store) => ({
          account:
            typeof store?.account === 'string' ? store.account.trim() : '',
          storeName:
            typeof store?.storeName === 'string'
              ? store.storeName.trim()
              : '',
        }))
        .filter((store) => store.account);
    } catch {
      return [];
    }
  }

  private resolvePerformanceBucket(params: {
    channelCode?: string | null;
    notes?: string | null;
    fallbackNotes?: string | null;
    stores: Array<{ account: string; storeName?: string }>;
  }) {
    const channelCode = (params.channelCode || '').trim().toUpperCase();
    const primaryMeta = this.extractMetadata(params.notes);
    const fallbackMeta = this.extractMetadata(params.fallbackNotes);
    const storeAccount =
      primaryMeta.storeAccount || fallbackMeta.storeAccount || '';

    if (channelCode === 'SHOPIFY') {
      return 'shopify';
    }

    if (channelCode === '1SHOP') {
      const matchedStore = params.stores.find(
        (store) => store.account === storeAccount,
      );
      if (matchedStore) {
        return `oneshop:${matchedStore.account}`;
      }
    }

    return 'other';
  }

  private resolveSettlementStatus(params: {
    reconciledFlag: boolean;
    paymentStatus?: string | null;
    rawStatus?: string | null;
  }) {
    if (params.reconciledFlag) {
      return 'reconciled';
    }

    const paymentStatus = (params.paymentStatus || '').trim().toLowerCase();
    const rawStatus = (params.rawStatus || '').trim().toLowerCase();

    if (
      ['paid', 'cod', 'completed', 'success'].includes(paymentStatus) ||
      ['completed', 'success'].includes(rawStatus)
    ) {
      return 'pending_payout';
    }

    if (['failed', 'cancelled', 'refunded'].includes(paymentStatus)) {
      return 'failed';
    }

    return 'pending_payment';
  }

  private resolveProviderSource(feeSource?: string | null) {
    const value = (feeSource || '').trim().toLowerCase();
    if (value.startsWith('provider-payout:ecpay')) {
      return 'ecpay';
    }
    if (value.startsWith('provider-payout:hitrust')) {
      return 'hitrust';
    }
    return null;
  }

  private extractMetadata(notes?: string | null) {
    const lines = (notes || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const meta: Record<string, string> = {};

    for (const line of lines) {
      const separator = line.indexOf('] ');
      const raw = separator >= 0 ? line.slice(separator + 2) : line;
      for (const pair of raw.split(';')) {
        const [key, ...rest] = pair.split('=');
        if (!key || !rest.length) {
          continue;
        }
        meta[key.trim()] = rest.join('=').trim();
      }
    }

    return meta;
  }
}
