import api from './api'

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

export interface ExpenseAccountRef {
  id: string
  code: string
  name: string
}

export interface ApprovalPolicyStep {
  id: string
  stepOrder: number
  approverRoleCode?: string | null
  requiresDepartmentHead?: boolean | null
  minAmount?: string | number | null
  maxAmount?: string | number | null
}

export interface ReimbursementItem {
  id: string
  name: string
  description?: string | null
  accountId: string
  account?: ExpenseAccountRef | null
  keywords?: string | null
  amountLimit?: string | number | null
  requiresDepartmentHead?: boolean
  approverRoleCodes?: string | null
  approvalPolicyId?: string | null
  defaultReceiptType?: string | null
  allowedRoles?: string | null
  allowedDepartments?: string | null
  allowedReceiptTypes?: string | null
  approvalPolicy?: {
    id: string
    steps: ApprovalPolicyStep[]
  } | null
}

export interface ExpenseRequest {
  id: string
  entityId: string
  amountOriginal: number | string
  amountCurrency: string
  amountFxRate: number | string
  amountBase: number | string
  description: string
  status: string
  priority: string
  dueDate?: string | null
  createdAt: string
  updatedAt: string
  suggestionConfidence?: number | string | null
  suggestedAccount?: ExpenseAccountRef | null
  finalAccount?: ExpenseAccountRef | null
  reimbursementItem?: ReimbursementItem | null
}

export interface ExpenseHistoryEntry {
  id: string
  action: string
  fromStatus?: string | null
  toStatus?: string | null
  note?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  actor?: {
    id: string
    name: string
    email?: string | null
  } | null
  suggestedAccount?: ExpenseAccountRef | null
  finalAccount?: ExpenseAccountRef | null
}

export interface SubmitFeedbackPayload {
  suggestedAccountId?: string
  chosenAccountId?: string
  confidence?: number
  label?: string
  features?: Record<string, unknown>
  comment?: string
}

export interface CreateExpenseRequestPayload {
  entityId?: string
  reimbursementItemId: string
  amountOriginal: number
  amountCurrency?: string
  amountFxRate?: number
  dueDate?: string
  description: string
  receiptType?: string
  metadata?: Record<string, unknown>
  departmentId?: string
  vendorId?: string
}

const buildParams = (params: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => Boolean(value)))

export const expenseService = {
  async getReimbursementItems(entityId?: string, roles?: string[], departmentId?: string) {
    const effectiveEntityId = entityId?.trim() || DEFAULT_ENTITY_ID
    const params: Record<string, string> = { entityId: effectiveEntityId }
    if (roles && roles.length) {
      params.roles = roles.join(',')
    }
    if (departmentId) {
      params.departmentId = departmentId
    }
    const response = await api.get<ReimbursementItem[]>('/expense/reimbursement-items', { params })
    return response.data
  },

  async getExpenseRequests(options: { entityId?: string; status?: string; mine?: boolean } = {}) {
    const params = buildParams({
      entityId: options.entityId?.trim() || DEFAULT_ENTITY_ID,
      status: options.status,
      mine: options.mine ? 'true' : undefined,
    })
    const response = await api.get<ExpenseRequest[]>('/expense/requests', { params })
    return response.data
  },

  async getExpenseRequest(id: string) {
    const response = await api.get<ExpenseRequest>(`/expense/requests/${id}`)
    return response.data
  },

  async getExpenseRequestHistory(id: string) {
    const response = await api.get<ExpenseHistoryEntry[]>(`/expense/requests/${id}/history`)
    return response.data
  },

  async createExpenseRequest(payload: CreateExpenseRequestPayload) {
    const response = await api.post<ExpenseRequest>('/expense/requests', {
      entityId: payload.entityId?.trim() || DEFAULT_ENTITY_ID,
      reimbursementItemId: payload.reimbursementItemId,
      amountOriginal: payload.amountOriginal,
      amountCurrency: payload.amountCurrency ?? 'TWD',
      amountFxRate: payload.amountFxRate ?? 1,
      dueDate: payload.dueDate,
      description: payload.description,
      receiptType: payload.receiptType,
      metadata: payload.metadata,
      departmentId: payload.departmentId,
      vendorId: payload.vendorId,
    })
    return response.data
  },

  async submitFeedback(requestId: string, payload: SubmitFeedbackPayload) {
    const response = await api.post(`/expense/requests/${requestId}/feedback`, payload)
    return response.data
  },
}
