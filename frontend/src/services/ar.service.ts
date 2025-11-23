import api from './api'
import { ArInvoice, PaginatedResult } from '../types'

export const arService = {
  getInvoices: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResult<ArInvoice>>('/ar/invoices', {
      params: { page, limit },
    })
    return response.data
  },

  getInvoice: async (id: string) => {
    const response = await api.get<ArInvoice>(`/ar/invoices/${id}`)
    return response.data
  },

  createInvoice: async (data: Partial<ArInvoice>) => {
    const response = await api.post<ArInvoice>('/ar/invoices', data)
    return response.data
  },

  updateInvoice: async (id: string, data: Partial<ArInvoice>) => {
    const response = await api.patch<ArInvoice>(`/ar/invoices/${id}`, data)
    return response.data
  },

  deleteInvoice: async (id: string) => {
    await api.delete(`/ar/invoices/${id}`)
  },
}
