import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ISalesChannelAdapter,
  UnifiedOrder,
  UnifiedTransaction,
} from '../interfaces/sales-channel-adapter.interface';

export type OneShopStoreConfig = {
  account?: string;
  storeName?: string;
  appId: string;
  secret: string;
};

type OneShopListOrder = {
  order_number: string;
  create_date: string;
  total_price: number | string;
  progress_status?: string;
  payment_status?: string;
  logistic_status?: string;
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
  shop_note?: string;
};

type OneShopListResponse = {
  success: number;
  data?: {
    order?: OneShopListOrder[] | OneShopListOrder;
    page?: {
      total_page?: number;
      correct_page?: number;
      page_order?: number;
      total_order?: number;
    };
  };
  msg?: string;
};

type OneShopDetailProduct = {
  product_type?: string;
  quantity?: number | string;
  per_cost?: number | string;
  line_total?: number | string;
  name?: string;
  sku?: string;
  label?: string;
};

type OneShopDetailReceipt = {
  third_party?: string;
  status?: number | string;
  type?: number | string;
  carruer_type?: number | string;
  carruer_num?: string;
  love_code?: string;
  tax_type?: number | string;
  email?: string;
  sales_amount?: number | string;
  invoice_number?: string;
  invoice_date?: string;
  random_number?: string;
  invoice_remark?: string;
  create_date?: string;
  receipt_title?: string;
  tax_num?: string;
  address?: string;
  phone?: string;
};

type OneShopDetailOrder = OneShopListOrder & {
  page_title?: string;
  page_prefix?: string;
  payment?: string;
  logistic?: string;
  payment_date?: string;
  payment_third_party?: string;
  payment_third_party_no?: string;
  logistics_third_party?: string;
  logistics_third_party_no?: string;
  logistics_shipping_no?: string;
  shop_url?: string;
  order_url?: string;
};

type OneShopDetailResponse = {
  success: number;
  data?: {
    order?: OneShopDetailOrder;
    cart?: {
      sub_total?: number | string;
      logistic_fee?: number | string;
      payment_fee?: number | string;
      refund?: number | string;
      total_price?: number | string;
      products?: OneShopDetailProduct[];
    };
    receipt?: OneShopDetailReceipt[] | OneShopDetailReceipt;
  };
  msg?: string;
};

@Injectable()
export class OneShopHttpAdapter implements ISalesChannelAdapter {
  readonly code = '1SHOP';
  private readonly logger = new Logger(OneShopHttpAdapter.name);
  private readonly baseUrl: string;
  private readonly minRequestIntervalMs: number;
  private readonly maxRetryCount: number;
  private readonly requestQueues = new Map<string, Promise<void>>();
  private readonly lastRequestAtByStore = new Map<string, number>();
  private readonly stores: OneShopStoreConfig[];

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('ONESHOP_API_BASE_URL', '') ||
      'https://api.1shop.tw/v1';
    this.minRequestIntervalMs = Number(
      this.configService.get<string>('ONESHOP_MIN_REQUEST_INTERVAL_MS', '1200'),
    );
    this.maxRetryCount = Number(
      this.configService.get<string>('ONESHOP_MAX_RETRY_COUNT', '2'),
    );
    this.stores = this.loadStores();
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    if (!this.stores.length) {
      return {
        success: false,
        message: 'ONESHOP stores configuration is required',
      };
    }

    try {
      for (const store of this.stores) {
        await this.fetchOrderPage(store, {
          page: 1,
          start: undefined,
          end: undefined,
        });
      }
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      this.logger.error(`1Shop connection failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  getStores() {
    return this.stores;
  }

  async fetchOrders(params: {
    start: Date;
    end: Date;
  }): Promise<UnifiedOrder[]> {
    this.assertConfig();

    const orders = await Promise.all(
      this.stores.map((store) => this.fetchOrdersForStore(store, params)),
    );

    return orders.flat();
  }

  async fetchOrdersForStore(
    store: OneShopStoreConfig,
    params: {
      start: Date;
      end: Date;
    },
  ): Promise<UnifiedOrder[]> {
    this.assertStoreConfig(store);

    const allOrders: UnifiedOrder[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const body = await this.fetchOrderPage(store, {
        page,
        start: params.start,
        end: params.end,
      });
      const orders = this.extractOrders(body);

      for (const order of orders) {
        const detail = await this.fetchOrderDetail(store, order.order_number);
        allOrders.push(this.mapToUnifiedOrder(store, order, detail));
      }

      totalPages = Number(body.data?.page?.total_page || page);
      page += 1;
    } while (page <= totalPages);

    return allOrders;
  }

  async fetchTransactions(params: {
    start: Date;
    end: Date;
  }): Promise<UnifiedTransaction[]> {
    this.assertConfig();
    const orders = await this.fetchOrders(params);

    return this.buildTransactionsFromOrders(orders);
  }

  buildTransactionsFromOrders(orders: UnifiedOrder[]): UnifiedTransaction[] {
    return orders
      .map((order) => this.mapOrderToUnifiedTransaction(order))
      .filter((value): value is UnifiedTransaction => Boolean(value));
  }

  private async fetchOrderPage(
    store: OneShopStoreConfig,
    params: {
      page: number;
      start?: Date;
      end?: Date;
    },
  ) {
    const search = new URLSearchParams({
      appid: store.appId,
      secret: store.secret,
      progress_status: 'all',
      payment_status: 'all',
      logistic_status: 'all',
      page: String(params.page),
    });

    if (params.start) {
      search.set('create_date_start', this.formatDateParam(params.start));
    }
    if (params.end) {
      search.set('create_date_end', this.formatDateParam(params.end));
    }

    return this.request<OneShopListResponse>(
      `/order?${search.toString()}`,
      store,
    );
  }

  private async fetchOrderDetail(
    store: OneShopStoreConfig,
    orderNumber: string,
  ) {
    const search = new URLSearchParams({
      appid: store.appId,
      secret: store.secret,
    });

    return this.request<OneShopDetailResponse>(
      `/order/${encodeURIComponent(orderNumber)}?${search.toString()}`,
      store,
    );
  }

  private extractOrders(body: OneShopListResponse) {
    const payload = body.data?.order;
    if (!payload) {
      return [] as OneShopListOrder[];
    }

    return Array.isArray(payload) ? payload : [payload];
  }

  private mapToUnifiedOrder(
    store: OneShopStoreConfig,
    raw: OneShopListOrder,
    detail?: OneShopDetailResponse,
  ): UnifiedOrder {
    const detailOrder = detail?.data?.order;
    const detailCart = detail?.data?.cart;
    const receipts = this.normalizeReceipts(detail?.data?.receipt);
    const gross = new Decimal(
      detailCart?.total_price ?? detailOrder?.total_price ?? raw.total_price ?? 0,
    );
    const tax = new Decimal(0);
    const discount = new Decimal(detailCart?.refund ?? 0);
    const shipping = new Decimal(detailCart?.logistic_fee ?? 0);
    const status = this.mapStatus(
      detailOrder?.progress_status || raw.progress_status,
      detailOrder?.payment_status || raw.payment_status,
    );
    const externalOrderId = String(raw.order_number);
    const externalStoreId = store.account || store.appId;
    const products = detailCart?.products || [];

    return {
      externalId: `${externalStoreId}:${externalOrderId}`,
      orderDate: this.parseOneShopDate(detailOrder?.create_date || raw.create_date),
      status,
      customer: {
        externalId: `${externalStoreId}:${externalOrderId}`,
        email: detailOrder?.email || raw.email || undefined,
        name: detailOrder?.name || raw.name || undefined,
        phone: detailOrder?.phone || raw.phone || undefined,
      },
      items: products.map((item) => {
        const lineTotal = new Decimal(item.line_total || 0);
        const qty = Number(item.quantity || 1) || 1;
        const unitPrice =
          item.per_cost !== undefined && item.per_cost !== null
            ? new Decimal(item.per_cost)
            : qty > 0
              ? lineTotal.div(qty)
              : new Decimal(0);

        return {
          sku: item.sku || `${externalOrderId}-${item.name || 'item'}`,
          productName: item.name || '1Shop Item',
          quantity: qty,
          unitPrice,
          discount: new Decimal(0),
          tax: new Decimal(0),
          total: lineTotal,
        };
      }),
      totals: {
        currency: 'TWD',
        gross,
        tax,
        discount,
        shipping,
        net: gross,
      },
      raw: {
        ...raw,
        ...(detailOrder || {}),
        cart: detailCart || null,
        receipt: receipts,
        sourceStoreAccount: store.account || null,
        sourceStoreName: store.storeName || null,
        sourceAppId: store.appId,
        originalOrderNumber: externalOrderId,
      },
    };
  }

  private mapOrderToUnifiedTransaction(
    order: UnifiedOrder,
  ): UnifiedTransaction | null {
    const raw = order.raw || {};
    const payment = this.pickFirstString(
      raw.payment_third_party,
      raw.payment,
      raw.receipt?.[0]?.third_party,
    );
    const providerPaymentId = this.pickFirstString(
      raw.payment_third_party_no,
      raw.logistics_third_party_no,
    );
    const gross = new Decimal(raw.cart?.total_price ?? order.totals.gross ?? 0);
    const fee = new Decimal(raw.cart?.payment_fee ?? 0);
    const net = gross.sub(fee).toDecimalPlaces(2);
    const paymentStatus = this.pickFirstString(raw.payment_status);
    const paymentDate = this.parseOneShopDate(raw.payment_date || raw.create_date);
    const transactionId = providerPaymentId || order.externalId;

    if (!payment && !providerPaymentId && paymentStatus === 'pending') {
      return null;
    }

    return {
      externalId: transactionId,
      orderId: order.externalId,
      date: paymentDate,
      type: raw.payment_status === 'refunded' ? 'refund' : 'sale',
      amount: gross,
      fee,
      net,
      currency: 'TWD',
      status: this.mapTransactionStatus(paymentStatus),
      gateway: payment,
      feeStatus: fee.gt(0) ? 'actual' : 'unavailable',
      feeSource: fee.gt(0) ? '1shop.cart.payment_fee' : '1shop.order',
      raw: {
        ...raw,
        receipt: raw.receipt || [],
      },
    };
  }

  private mapStatus(
    progressStatus?: string,
    paymentStatus?: string,
  ): 'pending' | 'completed' | 'cancelled' | 'refunded' {
    if (progressStatus === 'cancelled') {
      return 'cancelled';
    }

    if (paymentStatus === 'refunded') {
      return 'refunded';
    }

    if (progressStatus === 'completed') {
      return 'completed';
    }

    return 'pending';
  }

  private mapTransactionStatus(paymentStatus?: string) {
    if (paymentStatus === 'refunded') {
      return 'failed' as const;
    }

    if (paymentStatus === 'paid' || paymentStatus === 'cod') {
      return 'success' as const;
    }

    return 'pending' as const;
  }

  private parseOneShopDate(value?: string) {
    if (!value) {
      return new Date();
    }

    const normalized = value.replace(' ', 'T');
    return new Date(`${normalized}+08:00`);
  }

  private formatDateParam(value: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private async request<T>(
    path: string,
    store?: OneShopStoreConfig,
  ): Promise<T> {
    this.assertConfig();
    const rateKey = store?.appId || 'default';

    return this.scheduleRequest(rateKey, async () => {
      await this.waitForRateLimit(rateKey);

      const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

      for (let attempt = 0; attempt <= this.maxRetryCount; attempt += 1) {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        const bodyText = await response.text();
        let body: any = null;

        try {
          body = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          throw new Error(
            `1Shop API returned non-JSON response (${response.status})`,
          );
        }

        const apiMessage = body?.msg || bodyText || 'Unknown error';
        const hitRateLimit =
          response.status === 429 ||
          String(apiMessage).includes('超過速率限制');

        if (hitRateLimit && attempt < this.maxRetryCount) {
          const retryAfterMs = this.extractRetryDelayMs(apiMessage);
          this.logger.warn(
            `1Shop rate limit hit for ${rateKey}, retrying in ${retryAfterMs}ms (attempt ${attempt + 1}/${this.maxRetryCount + 1})`,
          );
          await this.sleep(retryAfterMs);
          continue;
        }

        if (!response.ok) {
          throw new Error(`1Shop API Error ${response.status}: ${apiMessage}`);
        }

        if (body?.success !== 0) {
          throw new Error(
            body?.msg || `1Shop API returned success=${body?.success}`,
          );
        }

        return body as T;
      }

      throw new Error('1Shop API request exhausted all retries');
    });
  }

  private async scheduleRequest<T>(rateKey: string, task: () => Promise<T>) {
    const previous = this.requestQueues.get(rateKey) || Promise.resolve();
    const current = previous.catch(() => undefined).then(task);

    this.requestQueues.set(
      rateKey,
      current.then(() => undefined, () => undefined),
    );

    return current;
  }

  private async waitForRateLimit(rateKey: string) {
    const now = Date.now();
    const lastRequestAt = this.lastRequestAtByStore.get(rateKey) || 0;
    const delta = now - lastRequestAt;

    if (delta < this.minRequestIntervalMs) {
      await this.sleep(this.minRequestIntervalMs - delta);
    }

    this.lastRequestAtByStore.set(rateKey, Date.now());
  }

  private extractRetryDelayMs(message?: string) {
    const match = String(message || '').match(/(\d+)\s*s/i);
    const seconds = match ? Number(match[1]) : 10;
    return Math.max(seconds, 1) * 1000;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private normalizeReceipts(
    receipt?: OneShopDetailReceipt[] | OneShopDetailReceipt,
  ) {
    if (!receipt) {
      return [] as OneShopDetailReceipt[];
    }

    return Array.isArray(receipt) ? receipt : [receipt];
  }

  private pickFirstString(...values: Array<unknown>) {
    return values
      .map((value) =>
        value === undefined || value === null ? '' : String(value).trim(),
      )
      .find((value) => value);
  }

  private assertConfig() {
    if (!this.baseUrl) {
      throw new Error('1Shop configuration missing: ONESHOP_API_BASE_URL');
    }

    if (!this.stores.length) {
      throw new Error('1Shop configuration missing: ONESHOP stores are required');
    }
  }

  private assertStoreConfig(store: OneShopStoreConfig) {
    if (!store.appId || !store.secret) {
      throw new Error('1Shop store configuration missing: appId and secret are required');
    }
  }

  private loadStores(): OneShopStoreConfig[] {
    const storesJson =
      this.configService.get<string>('ONESHOP_STORES_JSON', '') || '';

    if (storesJson.trim()) {
      try {
        const parsed = JSON.parse(storesJson);
        if (Array.isArray(parsed)) {
          return parsed
            .map((store) => ({
              account:
                typeof store?.account === 'string' ? store.account.trim() : '',
              storeName:
                typeof store?.storeName === 'string'
                  ? store.storeName.trim()
                  : '',
              appId: typeof store?.appId === 'string' ? store.appId.trim() : '',
              secret:
                typeof store?.secret === 'string' ? store.secret.trim() : '',
            }))
            .filter((store) => store.appId && store.secret);
        }
      } catch (error: any) {
        this.logger.error(`Invalid ONESHOP_STORES_JSON config: ${error.message}`);
      }
    }

    const appId = this.configService.get<string>('ONESHOP_APP_ID', '') || '';
    const secret = this.configService.get<string>('ONESHOP_SECRET', '') || '';
    const account =
      this.configService.get<string>('ONESHOP_ACCOUNT', '') || '';
    const storeName =
      this.configService.get<string>('ONESHOP_STORE_NAME', '') || '';

    if (appId && secret) {
      return [
        {
          account,
          storeName,
          appId,
          secret,
        },
      ];
    }

    return [];
  }
}
