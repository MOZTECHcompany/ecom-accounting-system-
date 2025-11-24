import api from './api'

export interface ReimbursementItem {
  id: string
  name: string
  description?: string | null
  accountId: string
  allowedRoles?: string | null
  allowedDepartments?: string | null
  allowedReceiptTypes?: string | null
}

export interface CreateExpenseRequestPayload {
  entityId: string
  reimbursementItemId: string
  amount: number
  currency: string
  expenseDate: string
  description?: string
  receiptType: string
}

export const expenseService = {
  async getReimbursementItems(entityId: string, roles?: string[], departmentId?: string) {
    const params: Record<string, string> = { entityId }
    if (roles && roles.length) {
      params.roles = roles.join(',')
    }
    if (departmentId) {
      params.departmentId = departmentId
    }
    const response = await api.get<ReimbursementItem[]>('/expense/reimbursement-items', { params })
    return response.data
  },

  async createExpenseRequest(payload: CreateExpenseRequestPayload) {
    const response = await api.post('/expense/requests', payload)
    return response.data
  },
}
