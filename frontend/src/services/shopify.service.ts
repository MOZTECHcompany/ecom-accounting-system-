import api from "./api";

const DEFAULT_ENTITY_ID =
  import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || "tw-entity-001";

export type ShopifySyncResult = {
  success: boolean;
  fetched: number;
  created: number;
  updated: number;
};

export type ShopifySummary = {
  entityId: string;
  range: { since: string | null; until: string | null };
  orders: {
    count: number;
    gross: number;
    tax: number;
    discount: number;
    shipping: number;
  };
  payouts: {
    gross: number;
    net: number;
    platformFee: number | null;
    platformFeeStatus:
      | "actual"
      | "estimated"
      | "mixed"
      | "unavailable"
      | "not_applicable"
      | "empty";
    platformFeeSource: string;
    platformFeeMessage: string | null;
  };
};

const PLATFORM_FEE_STATUSES = new Set([
  "actual",
  "estimated",
  "mixed",
  "unavailable",
  "not_applicable",
  "empty",
] as const);

function normalizePlatformFeeStatus(
  value: unknown,
): ShopifySummary["payouts"]["platformFeeStatus"] {
  if (
    typeof value === "string" &&
    PLATFORM_FEE_STATUSES.has(
      value as ShopifySummary["payouts"]["platformFeeStatus"],
    )
  ) {
    return value as ShopifySummary["payouts"]["platformFeeStatus"];
  }

  return "empty";
}

export const shopifyService = {
  async health(): Promise<{ ok: boolean; message?: string }> {
    const response = await api.get("/integrations/shopify/health");
    return response.data;
  },

  async syncOrders(params: {
    entityId?: string;
    since?: string;
    until?: string;
  }): Promise<ShopifySyncResult> {
    const response = await api.post("/integrations/shopify/sync/orders", {
      entityId: params.entityId?.trim() || DEFAULT_ENTITY_ID,
      since: params.since,
      until: params.until,
    });
    return response.data;
  },

  async syncTransactions(params: {
    entityId?: string;
    since?: string;
    until?: string;
  }): Promise<ShopifySyncResult> {
    const response = await api.post("/integrations/shopify/sync/transactions", {
      entityId: params.entityId?.trim() || DEFAULT_ENTITY_ID,
      since: params.since,
      until: params.until,
    });
    return response.data;
  },

  async summary(params?: {
    entityId?: string;
    since?: string;
    until?: string;
  }): Promise<ShopifySummary> {
    const entityId = params?.entityId?.trim() || DEFAULT_ENTITY_ID;
    const query = new URLSearchParams();
    query.append("entityId", entityId);
    if (params?.since) query.append("since", params.since);
    if (params?.until) query.append("until", params.until);

    const response = await api.get(
      `/integrations/shopify/summary?${query.toString()}`,
    );
    const summary = response.data as Partial<ShopifySummary>;
    const payouts = summary.payouts || {};

    return {
      entityId: summary.entityId || entityId,
      range: {
        since: summary.range?.since || null,
        until: summary.range?.until || null,
      },
      orders: {
        count: summary.orders?.count || 0,
        gross: summary.orders?.gross || 0,
        tax: summary.orders?.tax || 0,
        discount: summary.orders?.discount || 0,
        shipping: summary.orders?.shipping || 0,
      },
      payouts: {
        gross: payouts.gross || 0,
        net: payouts.net || 0,
        platformFee:
          typeof payouts.platformFee === "number" ? payouts.platformFee : null,
        platformFeeStatus: normalizePlatformFeeStatus(
          payouts.platformFeeStatus,
        ),
        platformFeeSource: payouts.platformFeeSource || "尚未同步交易資料",
        platformFeeMessage: payouts.platformFeeMessage || null,
      },
    };
  },
};
