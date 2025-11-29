import api from './api'
import { ApInvoice, ApInvoiceAlerts, ExpenseRequest, PaginatedResult } from '../types'

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

export interface BatchApInvoicePayload {
  vendorId: string
  invoiceNo: string
  amountOriginal: number
  amountCurrency?: string
  invoiceDate: string
  dueDate: string
  paymentFrequency?: 'one_time' | 'monthly'
  notes?: string
}

export const apService = {
  getInvoices: async (entityId?: string) => {
    const response = await api.get<ApInvoice[]>('/ap/invoices', {
      params: { entityId: entityId?.trim() || DEFAULT_ENTITY_ID },
    })
    return response.data
  },

  getInvoice: async (id: string) => {
    const response = await api.get<ApInvoice>(`/ap/invoices/${id}`)
    return response.data
  },

  createInvoice: async (data: Partial<ApInvoice>) => {
    const response = await api.post<ApInvoice>('/ap/invoices', {
      entityId: data.entityId?.trim() || DEFAULT_ENTITY_ID,
      ...data,
    })
    return response.data
  },

  updateInvoice: async (id: string, data: Partial<ApInvoice>) => {
    const response = await api.patch<ApInvoice>(`/ap/invoices/${id}`, data)
    return response.data
  },

  recordPayment: async (
    id: string,
    data: { amount: number; paymentDate?: string; newStatus?: string },
  ) => {
    const response = await api.post<ApInvoice>(`/ap/invoices/${id}/pay`, data)
    return response.data
  },

  getExpenses: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResult<ExpenseRequest>>('/expense/requests', {
      params: { page, limit },
    })
    return response.data
  },

  batchImportInvoices: async (entityId: string | undefined, invoices: BatchApInvoicePayload[]) => {
    const response = await api.post('/ap/invoices/batch-import', {
      entityId: entityId?.trim() || DEFAULT_ENTITY_ID,
      invoices,
    })
    return response.data as { created: number }
  },

  getInvoiceAlerts: async (entityId?: string) => {
    const response = await api.get<ApInvoiceAlerts>('/ap/invoices/alerts', {
      params: { entityId: entityId?.trim() || DEFAULT_ENTITY_ID },
    })
    return response.data
  },
}
