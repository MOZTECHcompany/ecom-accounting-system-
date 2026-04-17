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
    const buckets = [
      {
        key: 'shopify',
        label: 'Shopify 官網業績',
      },
      ...stores.slice(0, 2).map((store, index) => ({
        key: `oneshop:${store.account}`,
        label: `1shop 第${index + 1}個帳號業績`,
        account: store.account,
        storeName: store.storeName || null,
      })),
      {
        key: 'other',
        label: '其他業績',
      },
    ];

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
