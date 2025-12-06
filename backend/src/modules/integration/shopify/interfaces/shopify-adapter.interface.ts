export interface ShopifyOrderLineItem {
  id: string;
  sku?: string | null;
  title: string;
  quantity: number;
  price: number;
  currency: string;
  discount?: number;
  tax?: number;
}

export interface ShopifyOrderPayload {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt?: string;
  currency: string;
  totalPrice: number;
  subtotalPrice?: number;
  totalDiscounts?: number;
  totalTax?: number;
  shippingLinesTotal?: number;
  status?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  customerEmail?: string;
  customerId?: string;
  lineItems: ShopifyOrderLineItem[];
}

export interface ShopifyTransactionPayload {
  id: string;
  orderId?: string;
  kind: string; // sale, refund, capture, authorization, etc.
  status?: string;
  amount: number;
  currency: string;
  processedAt: string;
  gateway?: string;
  paymentMethod?: string;
  fee?: number;
  payoutId?: string;
  payoutDate?: string;
  source?: string;
}

export interface ShopifyProductPayload {
  id: string;
  sku?: string | null;
  title: string;
  price: number;
  currency: string;
  updatedAt: string;
}

export interface ShopifyInventoryLevelPayload {
  locationId: string;
  sku?: string | null;
  available: number;
  updatedAt: string;
}

export interface ShopifyAdapter {
  testConnection(): Promise<{ ok: boolean; message?: string }>;
  fetchOrders(params: {
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<ShopifyOrderPayload[]>;
  fetchTransactions(params: {
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<ShopifyTransactionPayload[]>;
  fetchProducts?(params: { since?: Date; limit?: number }): Promise<ShopifyProductPayload[]>;
  fetchInventoryLevels?(params: {
    since?: Date;
    limit?: number;
  }): Promise<ShopifyInventoryLevelPayload[]>;
}
