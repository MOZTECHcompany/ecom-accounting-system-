import api from './api'
import { Account } from '../types'

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

export const accountingService = {
  async getAccounts(entityId?: string): Promise<Account[]> {
    const effectiveEntityId = entityId?.trim() || DEFAULT_ENTITY_ID
    const response = await api.get<Account[]>('/accounting/accounts', {
      params: { entityId: effectiveEntityId },
    })
    return response.data
  },

  async getAccountById(id: string): Promise<Account> {
    const response = await api.get<Account>(`/accounting/accounts/${id}`)
    return response.data
  },

  async getIncomeStatement(startDate: string, endDate: string, entityId?: string): Promise<IncomeStatement> {
    const effectiveEntityId = entityId?.trim() || DEFAULT_ENTITY_ID
    const response = await api.get<IncomeStatement>('/accounting/reports/income-statement', {
      params: { entityId: effectiveEntityId, startDate, endDate },
    })
    return response.data
  },

  async getBalanceSheet(asOfDate: string, entityId?: string): Promise<BalanceSheet> {
    const effectiveEntityId = entityId?.trim() || DEFAULT_ENTITY_ID
    const response = await api.get<BalanceSheet>('/accounting/reports/balance-sheet', {
      params: { entityId: effectiveEntityId, asOfDate },
    })
    return response.data
  },

  async analyzeReport(data: { entityId: string; startDate: string; endDate: string; context?: string }): Promise<any> {
    const response = await api.post('/reports/analyze', data)
    return response.data
  },

}

export interface ReportItem {
  code: string
  name: string
  amount: number
}

export interface IncomeStatement {
  entityId: string
  startDate: string
  endDate: string
  revenues: ReportItem[]
  expenses: ReportItem[]
  totalRevenue: number
  totalExpense: number
  netIncome: number
}

export interface BalanceSheet {
  entityId: string
  asOfDate: string
  assets: ReportItem[]
  liabilities: ReportItem[]
  equity: ReportItem[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  calculatedRetainedEarnings: number
}
