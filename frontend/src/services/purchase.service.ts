import api from './api'

export interface PurchaseOrder {
  id: string
  // poNumber: string // Backend doesn't seem to have poNumber, it uses id or maybe I missed it. Schema has id.
  vendorId: string
  vendor: { name: string }
  status: 'pending' | 'received' | 'completed' | 'cancelled'
  totalAmountOriginal: number
  totalAmountCurrency: string
  orderDate: string
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  productId: string
  product: { 
    name: string; 
    sku: string;
    hasSerialNumbers?: boolean;
  }
  qty: number // Backend uses qty
  unitCost: number // Backend uses unitCost
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

  async receive(id: string, warehouseId: string = 'default-warehouse', serialNumbers?: { productId: string; serialNumbers: string[] }[]) {
    const response = await api.put<PurchaseOrder>(`/purchase-orders/${id}/receive`, { warehouseId, serialNumbers })
    return response.data
  }
}
