import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ShopifyAdapter,
  ShopifyOrderPayload,
  ShopifyTransactionPayload,
} from './interfaces/shopify-adapter.interface';

@Injectable()
export class ShopifyHttpAdapter implements ShopifyAdapter {
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
    // Ensure shopDomain doesn't have https:// or .myshopify.com if user put it in
    const domain = this.shopDomain.replace(/^https?:\/\//, '').replace(/.myshopify.com$/, '');
    return `https://${domain}.myshopify.com/admin/api/${this.apiVersion}`;
  }

  private get headers() {
    return {
      'X-Shopify-Access-Token': this.token,
      'Content-Type': 'application/json',
    };
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    if (!this.shopDomain || !this.token) {
      return { ok: false, message: 'SHOPIFY_SHOP or SHOPIFY_TOKEN not configured' };
    }
    try {
      await this.request('GET', '/shop.json');
      return { ok: true, message: 'Connection successful' };
    } catch (error: any) {
      this.logger.error(`Shopify connection failed: ${error.message}`);
      return { ok: false, message: error.message };
    }
  }

  async fetchOrders(params: {
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<ShopifyOrderPayload[]> {
    this.assertConfig();
    const limit = params.limit || 250; // Default to 250 for better throughput
    let path = `/orders.json?status=any&limit=${limit}`;

    if (params.since) path += `&updated_at_min=${params.since.toISOString()}`;
    if (params.until) path += `&updated_at_max=${params.until.toISOString()}`;

    let allOrders: ShopifyOrderPayload[] = [];
    let hasNext = true;

    try {
      while (hasNext) {
        const { body, headers } = await this.request('GET', path);
        const orders = (body.orders || []).map((order: any) => this.mapOrder(order));
        allOrders = allOrders.concat(orders);

        // Check Link header for pagination
        const linkHeader = headers.get('Link');
        if (linkHeader) {
          const nextLink = linkHeader.split(',').find((s) => s.includes('rel="next"'));
          if (nextLink) {
            const match = nextLink.match(/<([^>]+)>/);
            if (match) {
              // Use the full URL from the link header
              path = match[1];
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

  async fetchTransactions(params: {
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<ShopifyTransactionPayload[]> {
    this.assertConfig();
    // 1. Fetch orders in the range first
    const orders = await this.fetchOrders(params);
    const transactions: ShopifyTransactionPayload[] = [];

    // 2. Fetch transactions for each order
    // Note: This can be slow. In production, use a queue or GraphQL.
    for (const order of orders) {
      try {
        const { body } = await this.request('GET', `/orders/${order.id}/transactions.json`);
        const txs = (body.transactions || []).map((tx: any) => this.mapTransaction(tx, order.id));
        transactions.push(...txs);
      } catch (error: any) {
        this.logger.error(`Failed to fetch transactions for order ${order.id}: ${error.message}`);
        // Continue to next order
      }
    }

    return transactions;
  }

  private async request(method: string, path: string, body?: any): Promise<{ body: any; headers: Headers }> {
    // Handle absolute URLs (for pagination) or relative paths
    const url = path.startsWith('https://') ? path : `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify API Error ${res.status}: ${text}`);
    }
    return { body: await res.json(), headers: res.headers };
  }

  private assertConfig() {
    if (!this.shopDomain || !this.token) {
      throw new Error('Shopify configuration missing');
    }
  }

  private mapOrder(raw: any): ShopifyOrderPayload {
    return {
      id: raw.id.toString(),
      name: raw.name,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      currency: raw.currency,
      totalPrice: parseFloat(raw.total_price),
      subtotalPrice: parseFloat(raw.subtotal_price),
      totalDiscounts: parseFloat(raw.total_discounts),
      totalTax: parseFloat(raw.total_tax),
      status: raw.cancelled_at ? 'cancelled' : 'active',
      financialStatus: raw.financial_status,
      fulfillmentStatus: raw.fulfillment_status,
      customerEmail: raw.email || raw.customer?.email,
      customerId: raw.customer?.id?.toString(),
      lineItems: (raw.line_items || []).map((item: any) => ({
        id: item.id.toString(),
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        currency: raw.currency,
        discount: parseFloat(item.total_discount),
      })),
    };
  }

  private mapTransaction(raw: any, orderId: string): ShopifyTransactionPayload {
    return {
      id: raw.id.toString(),
      orderId: orderId,
      kind: raw.kind,
      status: raw.status,
      amount: parseFloat(raw.amount),
      currency: raw.currency,
      processedAt: raw.processed_at || raw.created_at,
      gateway: raw.gateway,
      paymentMethod: raw.payment_details?.credit_card_company || raw.gateway,
      source: raw.source_name,
    };
  }
}
