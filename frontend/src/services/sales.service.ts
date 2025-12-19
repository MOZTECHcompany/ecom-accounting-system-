import api from './api'

export interface SalesOrder {
  id: string
  orderNumber: string
  customerName?: string
  totalAmount: number
  currency: string
  status: 'pending' | 'completed' | 'cancelled'
  paymentStatus: string
  fulfillmentStatus: string
  createdAt: string
  items?: any[]
}

export const salesService = {
  async findAll(params?: { status?: string; channelId?: string }) {
    const response = await api.get<SalesOrder[]>('/sales/orders', { params })
    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<SalesOrder>(`/sales/orders/${id}`)
    return response.data
  },

  async create(data: any) {
    const response = await api.post<SalesOrder>('/sales/orders', data)
    return response.data
  },

  async complete(id: string) {
    const response = await api.post<SalesOrder>(`/sales/orders/${id}/complete`)
    return response.data
  },

  async fulfill(id: string, data: { warehouseId: string; itemSerialNumbers?: Record<string, string[]> }, entityId: string) {
    const response = await api.post(`/sales/orders/${id}/fulfill`, data, {
      params: { entityId }
    })
    return response.data
  }
}
