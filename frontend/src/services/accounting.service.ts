import api from './api'
import { Account } from '../types'

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

export const accountingService = {
  async getAccounts(entityId?: string): Promise<Account[]> {
    const effectiveEntityId = entityId?.trim() || DEFAULT_ENTITY_ID
    const response = await api.get<Account[]>('/accounting/accounts', {
      params: { entityId: effectiveEntityId },
    })
    return response.data
  },

  async getAccountById(id: string): Promise<Account> {
    const response = await api.get<Account>(`/accounting/accounts/${id}`)
    return response.data
  },
}
