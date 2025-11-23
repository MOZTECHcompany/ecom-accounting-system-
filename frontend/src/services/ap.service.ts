import api from './api'
import { ApInvoice, ExpenseRequest, PaginatedResult } from '../types'

export const apService = {
  getInvoices: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResult<ApInvoice>>('/ap/invoices', {
      params: { page, limit },
    })
    return response.data
  },

  getInvoice: async (id: string) => {
    const response = await api.get<ApInvoice>(`/ap/invoices/${id}`)
    return response.data
  },

  createInvoice: async (data: Partial<ApInvoice>) => {
    const response = await api.post<ApInvoice>('/ap/invoices', data)
    return response.data
  },

  updateInvoice: async (id: string, data: Partial<ApInvoice>) => {
    const response = await api.patch<ApInvoice>(`/ap/invoices/${id}`, data)
    return response.data
  },

  getExpenses: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResult<ExpenseRequest>>('/expense/requests', {
      params: { page, limit },
    })
    return response.data
  },
}
