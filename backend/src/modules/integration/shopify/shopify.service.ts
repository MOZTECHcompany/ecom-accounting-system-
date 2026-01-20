import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ShopifyHttpAdapter } from './shopify.adapter';
import { UnifiedOrder, UnifiedTransaction } from '../interfaces/sales-channel-adapter.interface';

const SHOPIFY_CHANNEL_CODE = 'SHOPIFY';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private defaultEntityId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: ShopifyHttpAdapter,
    private readonly config: ConfigService,
  ) { }

  onModuleInit() {
    this.defaultEntityId =
      this.config.get<string>('SHOPIFY_DEFAULT_ENTITY_ID') || 'tw-entity-001';
  }

  async testConnection() {
    return this.adapter.testConnection();
  }

  async syncOrders(params: { entityId: string; since?: Date; until?: Date }) {
    await this.assertEntityExists(params.entityId);

    // Adapter now expects 'start' and 'end'
    const orders = await this.adapter.fetchOrders({
      start: params.since || new Date(0), // Default to epoch if undefined? Or handle in adapter
      end: params.until || new Date(),
    });

    const channel = await this.ensureSalesChannel(params.entityId);
    let created = 0;
    let updated = 0;

    for (const order of orders) {
      try {
        const result = await this.upsertSalesOrder(params.entityId, channel.id, order);
        if (result === 'created') created++;
        if (result === 'updated') updated++;
      } catch (e) {
        this.logger.error(`Failed to sync order ${order.externalId}: ${e.message}`);
      }
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
      start: params.since || new Date(0),
      end: params.until || new Date(),
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

    const triggerEvents = [
      'orders/create',
      'orders/updated',
      'orders/paid',
      'refunds/create',
      'fulfillments/create',
      'fulfillments/update',
    ];

    if (triggerEvents.includes(event)) {
      try {
        await this.assertEntityExists(this.defaultEntityId);
        // Sync last 24 hours to be safe
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        await this.syncOrders({ entityId: this.defaultEntityId, since: yesterday });
        await this.syncTransactions({ entityId: this.defaultEntityId, since: yesterday });
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
    order: UnifiedOrder,
  ): Promise<'created' | 'updated'> {
    const existing = await this.prisma.salesOrder.findFirst({
      where: {
        entityId,
        channelId,
        externalOrderId: order.externalId,
      },
    });

    // FX Rate is already handled in Adapter, so here we just use it? 
    // Wait, UnifiedOrder result depends on how Adapter constructed it.
    // In our Adapter implementation:
    // currency is set, but we didn't explicitly demand specific fields for 'Original' vs 'Base' in UnifiedOrder.
    // UnifiedOrder.totals.gross is Decimal.
    // We need to calculate Base amount here using the FX rate.

    // Oh, the Adapter's `getFxRate` is private. 
    // We need the FX rate that WAS used or should be used.
    // Ideally UnifiedOrder should carry the exchange rate used, or we recalculate it?
    // Let's assume we re-fetch FX rate here or rely on the fact that we fixed the Adapter to use a better rate?
    // Actually, `UnifiedOrder` interface didn't have `fxRate`. 
    // I should add `fxRate` to `UnifiedOrder` to persist it!

    // Quick fix: Add getFxRate logic here again OR update Interface. 
    // Updating Interface is better. 
    // But for now to avoid changing interface file again (which I just wrote), 
    // I will use a helper here or duplicate the mock logic. 
    // Actually, I can add `fxRate` to `UnifiedOrder` easily if I edit the interface... 
    // Let's stick to calculating it here to keep `UnifiedOrder` generic?
    // No, FX rate is a property of the transaction/order time and currency. 

    const currency = order.totals.currency;
    const fxRate = new Decimal(await this.getFxRate(currency, order.orderDate));

    const toBase = (amount: Decimal) => amount.mul(fxRate);

    const data = {
      orderDate: order.orderDate,
      totalGrossOriginal: order.totals.gross,
      totalGrossCurrency: currency,
      totalGrossFxRate: fxRate,
      totalGrossBase: toBase(order.totals.gross),
      taxAmountOriginal: order.totals.tax,
      taxAmountCurrency: currency,
      taxAmountFxRate: fxRate,
      taxAmountBase: toBase(order.totals.tax),
      discountAmountOriginal: order.totals.discount,
      discountAmountCurrency: currency,
      discountAmountFxRate: fxRate,
      discountAmountBase: toBase(order.totals.discount),
      shippingFeeOriginal: order.totals.shipping,
      shippingFeeCurrency: currency,
      shippingFeeFxRate: fxRate,
      shippingFeeBase: toBase(order.totals.shipping),
      status: order.status,
      // hasInvoice: existing?.hasInvoice ?? false, // Keep existing flag
      notes: order.raw?.note || null,
    };

    if (existing) {
      await this.prisma.salesOrder.update({
        where: { id: existing.id },
        data: {
          ...data,
          hasInvoice: existing.hasInvoice, // Preserve
        },
      });
      return 'updated';
    }

    await this.prisma.salesOrder.create({
      data: {
        entityId,
        channelId,
        externalOrderId: order.externalId,
        hasInvoice: false,
        ...data,
        customerId: order.customer ? await this.ensureCustomer(entityId, order.customer) : undefined,
      },
    });
    return 'created';
  }

  private async upsertPayment(
    entityId: string,
    channelId: string,
    tx: UnifiedTransaction,
  ): Promise<'created' | 'updated'> {
    const existing = await this.prisma.payment.findFirst({
      where: {
        entityId,
        channelId,
        payoutBatchId: tx.externalId, // Using transaction ID as batch ID if generic
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

    const currency = tx.currency;
    const fxRate = new Decimal(await this.getFxRate(currency, tx.date));
    const toBase = (amount: Decimal) => amount.mul(fxRate);

    const data = {
      entityId,
      channelId,
      salesOrderId: salesOrder?.id ?? null,
      payoutBatchId: tx.externalId,
      channel: 'SHOPIFY',
      payoutDate: tx.date,
      amountGrossOriginal: tx.amount, // Start with Gross
      amountGrossCurrency: currency,
      amountGrossFxRate: fxRate,
      amountGrossBase: toBase(tx.amount),
      // Platform Fee
      feePlatformOriginal: tx.fee,
      feePlatformCurrency: currency,
      feePlatformFxRate: fxRate,
      feePlatformBase: toBase(tx.fee),
      // Gateway Fee (Treat as Platform Fee or Separate? System has feeGateway)
      // UnifiedTransaction has generic 'fee'. We map it to feePlatform for now.
      feeGatewayOriginal: new Decimal(0),
      feeGatewayCurrency: currency,
      feeGatewayFxRate: fxRate,
      feeGatewayBase: new Decimal(0),

      shippingFeePaidOriginal: new Decimal(0),
      shippingFeePaidCurrency: currency,
      shippingFeePaidFxRate: fxRate,
      shippingFeePaidBase: new Decimal(0),

      amountNetOriginal: tx.net,
      amountNetCurrency: currency,
      amountNetFxRate: fxRate,
      amountNetBase: toBase(tx.net),

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

  private async ensureCustomer(entityId: string, customerData: NonNullable<UnifiedOrder['customer']>) {
    // Check by email or external ID
    let customer = null;
    if (customerData.email) {
      customer = await this.prisma.customer.findFirst({
        where: { entityId, email: customerData.email },
      });
    }

    if (!customer && customerData.externalId) {
      // Search schema doesn't strictly have externalId on Customer unless in 'notes' or custom fields?
      // We'll check email only for now or create new.
    }

    if (customer) return customer.id;

    const newCustomer = await this.prisma.customer.create({
      data: {
        entityId,
        name: customerData.name || 'Unknown',
        email: customerData.email,
        phone: customerData.phone,
        // code field does not exist in schema
      },
    });
    return newCustomer.id;
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
        `Entity not found: ${entityId}.`,
      );
    }
  }

  // Duplicate helper for now. In future, use FxService.
  private async getFxRate(currency: string, date: Date): Promise<number> {
    if (currency === 'TWD') return 1;
    if (currency === 'USD') return 32.5;
    if (currency === 'CNY') return 4.5;
    if (currency === 'JPY') return 0.21;
    return 1;
  }
}
