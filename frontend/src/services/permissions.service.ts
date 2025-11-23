import api from './api'
import { Permission } from '../types'

export interface CreatePermissionPayload {
  resource: string
  action: string
  description?: string
}

export type UpdatePermissionPayload = Partial<CreatePermissionPayload>

export const permissionsService = {
  async list(): Promise<Permission[]> {
    const response = await api.get<Permission[]>('/permissions')
    return response.data
  },

  async create(payload: CreatePermissionPayload): Promise<Permission> {
    const response = await api.post<Permission>('/permissions', payload)
    return response.data
  },

  async update(id: string, payload: UpdatePermissionPayload): Promise<Permission> {
    const response = await api.patch<Permission>(`/permissions/${id}`, payload)
    return response.data
  },

  async remove(id: string): Promise<Permission> {
    const response = await api.delete<Permission>(`/permissions/${id}`)
    return response.data
  },
}
