import api from './api'

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

export type ShopifySyncResult = {
  success: boolean
  fetched: number
  created: number
  updated: number
}

export const shopifyService = {
  async health(): Promise<{ ok: boolean; message?: string }> {
    const response = await api.get('/integrations/shopify/health')
    return response.data
  },

  async syncOrders(params: { entityId?: string; since?: string; until?: string }): Promise<ShopifySyncResult> {
    const response = await api.post('/integrations/shopify/sync/orders', {
      entityId: params.entityId?.trim() || DEFAULT_ENTITY_ID,
      since: params.since,
      until: params.until,
    })
    return response.data
  },

  async syncTransactions(params: { entityId?: string; since?: string; until?: string }): Promise<ShopifySyncResult> {
    const response = await api.post('/integrations/shopify/sync/transactions', {
      entityId: params.entityId?.trim() || DEFAULT_ENTITY_ID,
      since: params.since,
      until: params.until,
    })
    return response.data
  },
}
