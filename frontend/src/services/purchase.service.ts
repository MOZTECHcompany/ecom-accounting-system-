import api from './api'

export interface PurchaseOrder {
  id: string
  poNumber: string
  vendorId: string
  vendor: { name: string }
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'
  totalAmount: number
  currency: string
  orderDate: string
  expectedDate?: string
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  productId: string
  product: { name: string; sku: string }
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface CreatePurchaseOrderDto {
  vendorId: string
  currency: string
  items: {
    productId: string
    quantity: number
    unitPrice: number
  }[]
  expectedDate?: string
  notes?: string
}

export const purchaseService = {
  async findAll() {
    const response = await api.get<PurchaseOrder[]>('/purchase-orders')
    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`)
    return response.data
  },

  async create(data: CreatePurchaseOrderDto) {
    const response = await api.post<PurchaseOrder>('/purchase-orders', data)
    return response.data
  },

  async receive(id: string, warehouseId: string = 'default-warehouse') {
    const response = await api.put<PurchaseOrder>(`/purchase-orders/${id}/receive`, { warehouseId })
    return response.data
  }
}
