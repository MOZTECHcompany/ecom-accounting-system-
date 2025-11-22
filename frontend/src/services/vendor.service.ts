import { api } from './api'
import { Vendor, CreateVendorDto, UpdateVendorDto } from '../types'

export const vendorService = {
  findAll: async () => {
    const response = await api.get<Vendor[]>('/vendors')
    return response.data
  },

  findOne: async (id: string) => {
    const response = await api.get<Vendor>(`/vendors/${id}`)
    return response.data
  },

  create: async (data: CreateVendorDto) => {
    const response = await api.post<Vendor>('/vendors', data)
    return response.data
  },

  update: async (id: string, data: UpdateVendorDto) => {
    const response = await api.patch<Vendor>(`/vendors/${id}`, data)
    return response.data
  },

  remove: async (id: string) => {
    const response = await api.delete<void>(`/vendors/${id}`)
    return response.data
  },
}
