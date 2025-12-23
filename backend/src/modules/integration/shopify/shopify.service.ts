import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ShopifyOrderPayload,
  ShopifyTransactionPayload,
} from './interfaces/shopify-adapter.interface';
import { ShopifyHttpAdapter } from './shopify.adapter';

const SHOPIFY_CHANNEL_CODE = 'SHOPIFY';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private defaultEntityId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: ShopifyHttpAdapter,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.defaultEntityId =
      this.config.get<string>('SHOPIFY_DEFAULT_ENTITY_ID') || 'tw-entity-001';
  }

  async testConnection() {
    return this.adapter.testConnection();
  }

  async syncOrders(params: { entityId: string; since?: Date; until?: Date }) {
    await this.assertEntityExists(params.entityId);
    const orders = await this.adapter.fetchOrders({
      since: params.since,
      until: params.until,
    });

    const channel = await this.ensureSalesChannel(params.entityId);
    let created = 0;
    let updated = 0;

    for (const order of orders) {
      const result = await this.upsertSalesOrder(params.entityId, channel.id, order);
      if (result === 'created') created++;
      if (result === 'updated') updated++;
    }

    return {
      success: true,
      fetched: orders.length,
      created,
      updated,
    };
  }

  async syncTransactions(params: { entityId: string; since?: Date; until?: Date }) {
    await this.assertEntityExists(params.entityId);
    const transactions = await this.adapter.fetchTransactions({
      since: params.since,
      until: params.until,
    });

    const channel = await this.ensureSalesChannel(params.entityId);
    let created = 0;
    let updated = 0;

    for (const tx of transactions) {
      const result = await this.upsertPayment(params.entityId, channel.id, tx);
      if (result === 'created') created++;
      if (result === 'updated') updated++;
    }

    return {
      success: true,
      fetched: transactions.length,
      created,
      updated,
    };
  }

  async getSummary(params: { entityId: string; since?: Date; until?: Date }) {
    const { entityId, since, until } = params;

    const dateFilter = (field: string) => {
      const filter: any = {};
      if (since) filter.gte = since;
      if (until) filter.lte = until;
      return Object.keys(filter).length ? { [field]: filter } : {};
    };

    const [ordersAgg, paymentsAgg, ordersCount] = await Promise.all([
      this.prisma.salesOrder.aggregate({
        where: {
          entityId,
          ...dateFilter('orderDate'),
        },
        _sum: {
          totalGrossOriginal: true,
          taxAmountOriginal: true,
          discountAmountOriginal: true,
          shippingFeeOriginal: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          entityId,
          ...dateFilter('payoutDate'),
        },
        _sum: {
          amountGrossOriginal: true,
          amountNetOriginal: true,
          feePlatformOriginal: true,
        },
      }),
      this.prisma.salesOrder.count({
        where: {
          entityId,
          ...dateFilter('orderDate'),
        },
      }),
    ]);

    const num = (value: any) => (value ? Number(value) : 0);

    return {
      entityId,
      range: { since: since?.toISOString() || null, until: until?.toISOString() || null },
      orders: {
        count: ordersCount,
        gross: num(ordersAgg._sum.totalGrossOriginal),
        tax: num(ordersAgg._sum.taxAmountOriginal),
        discount: num(ordersAgg._sum.discountAmountOriginal),
        shipping: num(ordersAgg._sum.shippingFeeOriginal),
      },
      payouts: {
        gross: num(paymentsAgg._sum.amountGrossOriginal),
        net: num(paymentsAgg._sum.amountNetOriginal),
        platformFee: num(paymentsAgg._sum.feePlatformOriginal),
      },
    };
  }

  async handleWebhook(event: string, payload: any, hmacValid: boolean) {
    this.logger.log(`Received Shopify webhook ${event}, hmacValid=${hmacValid}`);

    if (!hmacValid) {
      return { received: false, event, hmacValid };
    }

    // 依事件類型觸發同步（保守策略：只針對訂單/付款相關事件）
    const triggerEvents = [
      'orders/create',
      'orders/updated',
      'orders/paid',
      'refunds/create',
      'fulfillments/create',
      'fulfillments/update',
    ];

    if (triggerEvents.includes(event)) {
      // 不帶日期，拉最新一批（adapter 預設 50 筆），確保不漏單
      try {
        await this.assertEntityExists(this.defaultEntityId);
        await this.syncOrders({ entityId: this.defaultEntityId });
        await this.syncTransactions({ entityId: this.defaultEntityId });
      } catch (error) {
        this.logger.error(`Auto-sync failed for event ${event}: ${error.message}`);
      }
    }

    return { received: true, event, hmacValid };
  }

  private async ensureSalesChannel(entityId: string) {
    const existing = await this.prisma.salesChannel.findFirst({
      where: { entityId, code: SHOPIFY_CHANNEL_CODE },
    });

    if (existing) return existing;

    return this.prisma.salesChannel.create({
      data: {
        entityId,
        name: 'Shopify',
        code: SHOPIFY_CHANNEL_CODE,
        type: 'shopify',
        defaultCurrency: this.config.get<string>('DEFAULT_CURRENCY', 'TWD'),
      },
    });
  }

  private async upsertSalesOrder(
    entityId: string,
    channelId: string,
    order: ShopifyOrderPayload,
  ): Promise<'created' | 'updated'> {
    const existing = await this.prisma.salesOrder.findFirst({
      where: {
        entityId,
        channelId,
        externalOrderId: order.id,
      },
    });

    const totals = this.buildOrderTotals(order);

    if (existing) {
      await this.prisma.salesOrder.update({
        where: { id: existing.id },
        data: {
          orderDate: new Date(order.createdAt),
          totalGrossOriginal: totals.totalGrossOriginal,
          totalGrossCurrency: totals.currency,
          totalGrossFxRate: totals.fxRate,
          totalGrossBase: totals.totalGrossBase,
          taxAmountOriginal: totals.taxAmountOriginal,
          taxAmountCurrency: totals.currency,
          taxAmountFxRate: totals.fxRate,
          taxAmountBase: totals.taxAmountBase,
          discountAmountOriginal: totals.discountAmountOriginal,
          discountAmountCurrency: totals.currency,
          discountAmountFxRate: totals.fxRate,
          discountAmountBase: totals.discountAmountBase,
          shippingFeeOriginal: totals.shippingFeeOriginal,
          shippingFeeCurrency: totals.currency,
          shippingFeeFxRate: totals.fxRate,
          shippingFeeBase: totals.shippingFeeBase,
          status: this.mapShopifyStatus(order.status, order.financialStatus),
          hasInvoice: existing.hasInvoice,
          notes: order.name || existing.notes,
        },
      });
      return 'updated';
    }

    await this.prisma.salesOrder.create({
      data: {
        entityId,
        channelId,
        externalOrderId: order.id,
        orderDate: new Date(order.createdAt),
        totalGrossOriginal: totals.totalGrossOriginal,
        totalGrossCurrency: totals.currency,
        totalGrossFxRate: totals.fxRate,
        totalGrossBase: totals.totalGrossBase,
        taxAmountOriginal: totals.taxAmountOriginal,
        taxAmountCurrency: totals.currency,
        taxAmountFxRate: totals.fxRate,
        taxAmountBase: totals.taxAmountBase,
        discountAmountOriginal: totals.discountAmountOriginal,
        discountAmountCurrency: totals.currency,
        discountAmountFxRate: totals.fxRate,
        discountAmountBase: totals.discountAmountBase,
        shippingFeeOriginal: totals.shippingFeeOriginal,
        shippingFeeCurrency: totals.currency,
        shippingFeeFxRate: totals.fxRate,
        shippingFeeBase: totals.shippingFeeBase,
        status: this.mapShopifyStatus(order.status, order.financialStatus),
        hasInvoice: false,
      },
    });
    return 'created';
  }

  private buildOrderTotals(order: ShopifyOrderPayload) {
    const currency = order.currency || 'TWD';
    const fxRate = this.dec(order.currency === 'TWD' ? 1 : 1); // 預留匯率外部配置
    const totalGross = this.dec(order.totalPrice || 0);
    const taxAmount = this.dec(order.totalTax || 0);
    const discount = this.dec(order.totalDiscounts || 0);
    const shipping = this.dec(order.shippingLinesTotal || 0);

    return {
      currency,
      fxRate,
      totalGrossOriginal: totalGross,
      totalGrossBase: totalGross.mul(fxRate),
      taxAmountOriginal: taxAmount,
      taxAmountBase: taxAmount.mul(fxRate),
      discountAmountOriginal: discount,
      discountAmountBase: discount.mul(fxRate),
      shippingFeeOriginal: shipping,
      shippingFeeBase: shipping.mul(fxRate),
    };
  }

  private async upsertPayment(
    entityId: string,
    channelId: string,
    tx: ShopifyTransactionPayload,
  ): Promise<'created' | 'updated'> {
    const currency = tx.currency || 'TWD';
    const fxRate = this.dec(currency === 'TWD' ? 1 : 1);
    const amount = this.dec(tx.amount || 0);
    const platformFee = this.dec(tx.fee || 0);
    const gatewayFee = this.dec(0);
    const shippingFee = this.dec(0);
    const net = amount.sub(platformFee).sub(gatewayFee).sub(shippingFee);

    const existing = await this.prisma.payment.findFirst({
      where: {
        entityId,
        channelId,
        payoutBatchId: tx.payoutId || tx.id,
      },
    });

    const salesOrder = tx.orderId
      ? await this.prisma.salesOrder.findFirst({
          where: {
            entityId,
            channelId,
            externalOrderId: tx.orderId,
          },
        })
      : null;

    const data = {
      entityId,
      channelId,
      salesOrderId: salesOrder?.id ?? null,
      payoutBatchId: tx.payoutId || tx.id,
      channel: 'SHOPIFY',
      payoutDate: new Date(tx.payoutDate || tx.processedAt),
      amountGrossOriginal: amount,
      amountGrossCurrency: currency,
      amountGrossFxRate: fxRate,
      amountGrossBase: amount.mul(fxRate),
      feePlatformOriginal: platformFee,
      feePlatformCurrency: currency,
      feePlatformFxRate: fxRate,
      feePlatformBase: platformFee.mul(fxRate),
      feeGatewayOriginal: gatewayFee,
      feeGatewayCurrency: currency,
      feeGatewayFxRate: fxRate,
      feeGatewayBase: gatewayFee.mul(fxRate),
      shippingFeePaidOriginal: shippingFee,
      shippingFeePaidCurrency: currency,
      shippingFeePaidFxRate: fxRate,
      shippingFeePaidBase: shippingFee.mul(fxRate),
      amountNetOriginal: net,
      amountNetCurrency: currency,
      amountNetFxRate: fxRate,
      amountNetBase: net.mul(fxRate),
      reconciledFlag: false,
      bankAccountId: null,
    };

    if (existing) {
      await this.prisma.payment.update({
        where: { id: existing.id },
        data,
      });
      return 'updated';
    }

    await this.prisma.payment.create({ data });
    return 'created';
  }

  private mapShopifyStatus(status?: string, financialStatus?: string) {
    const s = status?.toLowerCase() || financialStatus?.toLowerCase() || 'pending';
    if (s.includes('paid') || s.includes('captured')) return 'completed';
    if (s.includes('refunded')) return 'refunded';
    if (s.includes('cancel')) return 'cancelled';
    return 'pending';
  }

  private dec(value: number | string | Decimal) {
    return new Decimal(value || 0);
  }

  private async assertEntityExists(entityId: string) {
    if (!entityId?.trim()) {
      throw new BadRequestException('entityId is required');
    }

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new BadRequestException(
        `Entity not found: ${entityId}. Please set VITE_DEFAULT_ENTITY_ID (frontend) or pass a valid entityId.`,
      );
    }
  }
}
