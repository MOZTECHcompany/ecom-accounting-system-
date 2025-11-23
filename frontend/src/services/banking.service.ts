import api from './api'
import { BankAccount, BankTransaction, PaginatedResult } from '../types'

export const bankingService = {
  getAccounts: async () => {
    const response = await api.get<BankAccount[]>('/banking/accounts')
    return response.data
  },

  getAccount: async (id: string) => {
    const response = await api.get<BankAccount>(`/banking/accounts/${id}`)
    return response.data
  },

  createAccount: async (data: Partial<BankAccount>) => {
    const response = await api.post<BankAccount>('/banking/accounts', data)
    return response.data
  },

  getTransactions: async (accountId: string, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResult<BankTransaction>>(`/banking/accounts/${accountId}/transactions`, {
      params: { page, limit },
    })
    return response.data
  },

  importTransactions: async (accountId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/banking/accounts/${accountId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
