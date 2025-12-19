import api from './api'

export const inventoryService = {
  async getWarehouses(entityId: string) {
    const response = await api.get('/inventory/warehouses', { params: { entityId } })
    return response.data
  }
}
