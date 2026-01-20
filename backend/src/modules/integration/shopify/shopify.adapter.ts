import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ISalesChannelAdapter,
  UnifiedOrder,
  UnifiedTransaction,
} from '../interfaces/sales-channel-adapter.interface';

interface ShopifyOrderPayload {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  financial_status: string;
  fulfillment_status: string;
  email: string;
  customer?: { id: number; email: string; first_name: string; last_name: string; phone: string };
  line_items: any[];
  shipping_lines: any[];
  cancelled_at: string | null;
}

@Injectable()
export class ShopifyHttpAdapter implements ISalesChannelAdapter {
  readonly code = 'SHOPIFY';
  private readonly logger = new Logger(ShopifyHttpAdapter.name);
  private readonly shopDomain: string;
  private readonly token: string;
  private readonly apiVersion: string;

  constructor(private readonly configService: ConfigService) {
    this.shopDomain = this.configService.get<string>('SHOPIFY_SHOP', '') || '';
    this.token = this.configService.get<string>('SHOPIFY_TOKEN', '') || '';
    this.apiVersion = this.configService.get<string>('SHOPIFY_API_VERSION', '2024-10');
  }

  private get baseUrl() {
    const domain = this.shopDomain.replace(/^https?:\/\//, '').replace(/.myshopify.com$/, '');
    return `https://${domain}.myshopify.com/admin/api/${this.apiVersion}`;
  }

  private get headers() {
    return {
      'X-Shopify-Access-Token': this.token,
      'Content-Type': 'application/json',
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    if (!this.shopDomain || !this.token) {
      return { success: false, message: 'SHOPIFY_SHOP or SHOPIFY_TOKEN not configured' };
    }
    try {
      await this.request('GET', '/shop.json');
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      this.logger.error(`Shopify connection failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async fetchOrders(params: { start: Date; end: Date }): Promise<UnifiedOrder[]> {
    this.assertConfig();
    const limit = 250;
    let path = `/orders.json?status=any&limit=${limit}`;

    if (params.start) path += `&updated_at_min=${params.start.toISOString()}`;
    if (params.end) path += `&updated_at_max=${params.end.toISOString()}`;

    let allOrders: UnifiedOrder[] = [];
    let hasNext = true;

    try {
      while (hasNext) {
        const { body, headers } = await this.request('GET', path);
        if (!body.orders) break;

        // Sequential processing to allow async FX rate fetching
        const mappedOrders: UnifiedOrder[] = [];
        for (const order of body.orders) {
          mappedOrders.push(await this.mapToUnifiedOrder(order));
        }
        allOrders = allOrders.concat(mappedOrders);

        const linkHeader = headers.get('Link');
        if (linkHeader) {
          const nextLink = linkHeader.split(',').find((s: string) => s.includes('rel="next"'));
          if (nextLink) {
            const match = nextLink.match(/<([^>]+)>/);
            if (match) {
              const url = new URL(match[1]);
              path = `${url.pathname}${url.search}`; // Extract path and query
            } else {
              hasNext = false;
            }
          } else {
            hasNext = false;
          }
        } else {
          hasNext = false;
        }
      }
      return allOrders;
    } catch (error: any) {
      this.logger.error(`Failed to fetch orders: ${error.message}`);
      throw error;
    }
  }

  async fetchTransactions(params: { start: Date; end: Date }): Promise<UnifiedTransaction[]> {
    this.assertConfig();
    const orders = await this.fetchOrders(params);
    const transactions: UnifiedTransaction[] = [];

    for (const order of orders) {
      try {
        const { body } = await this.request('GET', `/orders/${order.externalId}/transactions.json`);
        // Parallel map is fine here if no async calls inside mapToUnifiedTransaction, but there might be later.
        const txs = await Promise.all(
          (body.transactions || []).map((tx: any) => this.mapToUnifiedTransaction(tx, order))
        );
        transactions.push(...txs);
      } catch (error: any) {
        this.logger.error(`Failed to fetch txs for order ${order.externalId}: ${error.message}`);
      }
    }
    return transactions;
  }

  // --- Private Helpers ---

  private async mapToUnifiedOrder(raw: ShopifyOrderPayload): Promise<UnifiedOrder> {
    const currency = raw.currency;
    const fxRate = await this.getFxRate(currency, new Date(raw.created_at));

    const totalGross = new Decimal(raw.total_price);
    const totalTax = new Decimal(raw.total_tax);
    const totalDiscount = new Decimal(raw.total_discounts);

    const shippingAmount = (raw.shipping_lines || []).reduce(
      (sum: Decimal, line: any) => sum.add(new Decimal(line.price)),
      new Decimal(0)
    );

    let status: 'pending' | 'completed' | 'cancelled' | 'refunded' = 'pending';
    if (raw.cancelled_at) status = 'cancelled';
    else if (raw.financial_status === 'refunded') status = 'refunded';
    else if (raw.financial_status === 'paid') status = 'completed';

    // Calculate Net Sales (Gross - Tax - Discount + Shipping ?? ) 
    // Usually: Gross (Total Price user pays) = ItemsTotal - Discount + Tax + Shipping
    // Net for Accounting usually means Excl. Tax.
    // UnifiedOrderTotals.net here is just a placeholder, usage depends on service logic.
    // We'll set it to Total Price for now.

    return {
      externalId: raw.id.toString(),
      orderDate: new Date(raw.created_at),
      status,
      customer: raw.customer ? {
        externalId: raw.customer.id.toString(),
        email: raw.customer.email || raw.email,
        name: `${raw.customer.first_name} ${raw.customer.last_name}`.trim(),
        phone: raw.customer.phone,
      } : undefined,
      items: (raw.line_items || []).map((item: any) => ({
        sku: item.sku || 'UNKNOWN',
        productName: item.title,
        quantity: item.quantity,
        unitPrice: new Decimal(item.price),
        discount: new Decimal(item.total_discount || 0),
        tax: new Decimal(0), // Shopify items don't easily expose tax per line without digging
        total: new Decimal(item.price).mul(item.quantity).sub(item.total_discount || 0),
      })),
      totals: {
        currency,
        gross: totalGross,
        tax: totalTax,
        discount: totalDiscount,
        shipping: shippingAmount,
        net: totalGross,
      },
      raw,
    };
  }

  private async mapToUnifiedTransaction(raw: any, order: UnifiedOrder): Promise<UnifiedTransaction> {
    const currency = raw.currency;
    const amount = new Decimal(raw.amount);

    let fee = new Decimal(0);
    // TODO: Implement fee mapping based on Gateway

    return {
      externalId: raw.id.toString(),
      orderId: order.externalId,
      date: new Date(raw.processed_at || raw.created_at),
      type: raw.kind === 'refund' ? 'refund' : 'sale',
      amount,
      fee,
      net: amount.sub(fee),
      currency,
      status: raw.status === 'success' ? 'success' : 'failed',
      raw,
    };
  }

  private async getFxRate(currency: string, date: Date): Promise<number> {
    if (currency === 'TWD') return 1;
    if (currency === 'USD') return 32.5;
    if (currency === 'CNY') return 4.5;
    if (currency === 'JPY') return 0.21;
    return 1;
  }

  private async request(method: string, path: string, body?: any): Promise<{ body: any; headers: Headers }> {
    const url = path.startsWith('https://') ? path : `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      // Handle HTML error pages (e.g. 404) gracefully if possible, or just throw
      throw new Error(`Shopify API Error ${res.status}: ${text}`);
    }
    return { body: await res.json(), headers: res.headers };
  }

  private assertConfig() {
    if (!this.shopDomain || !this.token) {
      throw new Error('Shopify configuration missing');
    }
  }
}
