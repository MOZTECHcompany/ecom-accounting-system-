import api from './api'
import { Account } from '../types'

export const accountingService = {
  async getAccounts(entityId?: string): Promise<Account[]> {
    const params = entityId ? { entityId } : {}
    const response = await api.get<Account[]>('/accounting/accounts', { params })
    return response.data
  },

  async getAccountById(id: string): Promise<Account> {
    const response = await api.get<Account>(`/accounting/accounts/${id}`)
    return response.data
  },
}
