import api from './api'

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

export type ReconciliationBucketKey =
  | 'pending_payout'
  | 'ready_to_clear'
  | 'cleared'
  | 'exceptions'

export type ReconciliationCenterItem = {
  key: string
  orderId: string
  orderNumber: string
  customerName: string
  sourceLabel: string
  sourceBrand?: string | null
  channelCode?: string | null
  orderDate: string
  dueDate?: string | null
  bucket: ReconciliationBucketKey
  bucketLabel: string
  grossAmount: number
  paidAmount: number
  netAmount: number
  feeTotal: number
  gatewayFeeAmount?: number
  platformFeeAmount?: number
  outstandingAmount: number
  invoiceNumber?: string | null
  invoiceStatus?: string | null
  feeStatus?: string | null
  feeSource?: string | null
  reconciledFlag: boolean
  accountingPosted: boolean
  settlementPhase?: string | null
  settlementPhaseLabel?: string | null
  collectionOwnerLabel?: string | null
  severity: 'healthy' | 'warning' | 'critical'
  reason: string
  nextAction: string
  anomalyCodes?: string[]
  anomalyMessages?: string[]
  providerTradeNo?: string | null
  providerPaymentId?: string | null
}

export type ReconciliationCenterBucket = {
  key: ReconciliationBucketKey
  label: string
  count: number
  grossAmount: number
  paidAmount: number
  netAmount: number
  outstandingAmount: number
  feeTotal: number
  items: ReconciliationCenterItem[]
}

export type ReconciliationCenterResponse = {
  entityId: string
  range: {
    startDate: string | null
    endDate: string | null
  }
  summary: {
    totalCount: number
    pendingPayoutCount: number
    readyToClearCount: number
    clearedCount: number
    exceptionCount: number
    grossAmount: number
    paidAmount: number
    netAmount: number
    outstandingAmount: number
    pendingPayoutAmount: number
    exceptionAmount: number
    feeTotal: number
    completionRate: number
    lastGeneratedAt: string
  }
  buckets: Record<ReconciliationBucketKey, ReconciliationCenterBucket>
  priorityItems: ReconciliationCenterItem[]
  rules: Array<{
    key: string
    label: string
    description: string
  }>
}

export const reconciliationService = {
  getCenter: async (params?: {
    entityId?: string
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    const entityId =
      params?.entityId?.trim() || localStorage.getItem('entityId')?.trim() || DEFAULT_ENTITY_ID

    const response = await api.get<ReconciliationCenterResponse>('/reconciliation/center', {
      params: {
        entityId,
        startDate: params?.startDate,
        endDate: params?.endDate,
        limit: params?.limit,
      },
    })
    return response.data
  },
}
