import api from './api'

export interface AssemblyOrder {
  id: string
  woNumber: string
  productId: string
  product: { name: string; sku: string }
  quantity: number
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  startDate?: string
  completionDate?: string
  notes?: string
}

export interface CreateAssemblyOrderDto {
  productId: string
  quantity: number
  notes?: string
  plannedDate?: string
}

export const assemblyService = {
  async findAll() {
    const response = await api.get<AssemblyOrder[]>('/assembly-orders')
    return response.data
  },

  async findOne(id: string) {
    const response = await api.get<AssemblyOrder>(`/assembly-orders/${id}`)
    return response.data
  },

  async create(data: CreateAssemblyOrderDto) {
    const response = await api.post<AssemblyOrder>('/assembly-orders', data)
    return response.data
  },

  async execute(id: string) {
    const response = await api.put<AssemblyOrder>(`/assembly-orders/${id}/execute`)
    return response.data
  }
}
