import api from './api'
import { resolveEntityId } from './entities.service'

export interface PurchaseOrder {
  id: string
  // poNumber: string // Backend doesn't seem to have poNumber, it uses id or maybe I missed it. Schema has id.
  vendorId: string
  vendor: { name: string }
  status: 'pending' | 'receiving' | 'received' | 'completed' | 'cancelled'
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
  unitCostOriginal: number
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
  async findAll(explicitEntityId?: string) {
    const entityId = await resolveEntityId(explicitEntityId)
    const response = await api.get<PurchaseOrder[]>('/purchase-orders', { params: { entityId } })
    return response.data
  },

  async findOne(id: string, explicitEntityId?: string) {
    const entityId = await resolveEntityId(explicitEntityId)
    const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`, { params: { entityId } })
    return response.data
  },

  async create(data: CreatePurchaseOrderDto, explicitEntityId?: string) {
    const entityId = await resolveEntityId(explicitEntityId)
    const response = await api.post<PurchaseOrder>('/purchase-orders', data, { params: { entityId } })
    return response.data
  },

  async receive(id: string, warehouseId: string, serialNumbers?: { productId: string; serialNumbers: string[] }[], explicitEntityId?: string) {
    const entityId = await resolveEntityId(explicitEntityId)
    const response = await api.put<PurchaseOrder>(`/purchase-orders/${id}/receive`, { warehouseId, serialNumbers }, { params: { entityId } })
    return response.data
  }
}
