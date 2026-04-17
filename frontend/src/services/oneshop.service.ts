import api from "./api";

const DEFAULT_ENTITY_ID =
  import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || "tw-entity-001";

type SyncResult = {
  success: boolean;
  fetched: number;
  created: number;
  updated: number;
};

export const oneShopService = {
  async syncOrders(params?: {
    entityId?: string;
    since?: string;
    until?: string;
  }): Promise<SyncResult> {
    const response = await api.post<SyncResult>("/integrations/1shop/sync/orders", {
      entityId: params?.entityId?.trim() || DEFAULT_ENTITY_ID,
      since: params?.since,
      until: params?.until,
    });
    return response.data;
  },

  async syncTransactions(params?: {
    entityId?: string;
    since?: string;
    until?: string;
  }): Promise<SyncResult> {
    const response = await api.post<SyncResult>(
      "/integrations/1shop/sync/transactions",
      {
        entityId: params?.entityId?.trim() || DEFAULT_ENTITY_ID,
        since: params?.since,
        until: params?.until,
      },
    );
    return response.data;
  },
};
