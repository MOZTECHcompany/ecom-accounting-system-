export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  roles: Role[]
  permissions: string[]
}

export interface Role {
  id: string
  code: string
  name: string
  description?: string
  hierarchyLevel: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: User
}

export interface Account {
  id: string
  code: string
  name: string
  nameEn: string
  type: string
  category: string
  isActive: boolean
  balance: number
  currency: string
  entity: {
    id: string
    code: string
    name: string
  }
}

export interface Vendor {
  id: string
  code: string
  name: string
  taxId?: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateVendorDto {
  code: string
  name: string
  taxId?: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
  currency?: string
  isActive?: boolean
}

export type UpdateVendorDto = Partial<CreateVendorDto>
