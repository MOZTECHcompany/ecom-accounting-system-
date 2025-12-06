import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ShopifyAdapter,
  ShopifyOrderPayload,
  ShopifyTransactionPayload,
  ShopifyProductPayload,
  ShopifyInventoryLevelPayload,
} from './interfaces/shopify-adapter.interface';

/**
 * ShopifyAdapter
 *
 * 備註：此處僅提供骨架與接口，實際呼叫 Shopify Admin API 時請補上 HTTP client（例如 fetch 或 axios）。
 * - 認證：使用 Admin API Access Token，Header: `X-Shopify-Access-Token`。
 * - API 版本：使用環境變數 `SHOPIFY_API_VERSION`，預設 2024-10。
 */
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

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    if (!this.shopDomain || !this.token) {
      return { ok: false, message: 'SHOPIFY_SHOP 或 SHOPIFY_TOKEN 未設定' };
    }
    // TODO: 實際呼叫 Shopify Admin API `/shop.json` 做健康檢查
    return { ok: true, message: 'Config loaded, pending real API call' };
  }

  async fetchOrders(params: {
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<ShopifyOrderPayload[]> {
    this.assertConfig();
    // TODO: 呼叫 GET /admin/api/{version}/orders.json?status=any&updated_at_min=...&updated_at_max=...
    // 1) 加入 created_at/updated_at 過濾
    // 2) 分頁處理（link header cursor）
    // 3) 將回應轉為 ShopifyOrderPayload
    this.logger.warn('fetchOrders not implemented; returning empty list');
    return [];
  }

  async fetchTransactions(params: {
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<ShopifyTransactionPayload[]> {
    this.assertConfig();
    // TODO: 呼叫 GET /admin/api/{version}/shopify_payments/balance/transactions.json 或 /orders/{id}/transactions.json
    this.logger.warn('fetchTransactions not implemented; returning empty list');
    return [];
  }

  async fetchProducts?(params: {
    since?: Date;
    limit?: number;
  }): Promise<ShopifyProductPayload[]> {
    this.assertConfig();
    // TODO: 呼叫 GET /admin/api/{version}/products.json 並轉換為統一結構
    this.logger.warn('fetchProducts not implemented; returning empty list');
    return [];
  }

  async fetchInventoryLevels?(params: {
    since?: Date;
    limit?: number;
  }): Promise<ShopifyInventoryLevelPayload[]> {
    this.assertConfig();
    // TODO: 呼叫 GET /admin/api/{version}/inventory_levels.json
    this.logger.warn('fetchInventoryLevels not implemented; returning empty list');
    return [];
  }

  private assertConfig() {
    if (!this.shopDomain || !this.token) {
      throw new Error('Shopify config missing: SHOPIFY_SHOP or SHOPIFY_TOKEN');
    }
  }
}
