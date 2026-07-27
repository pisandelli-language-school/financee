import type { DashboardView, ReportRegime } from './auth'
import type { ContractStatus } from './contracts'

export type ReportsView = 'fluxo-caixa' | 'dre' | 'inadimplencia' | 'contratos'
export type DelinquencyTemperature = 'LOW' | 'MEDIUM' | 'HIGH'
export type DreGroupKey =
  | 'OPERATING_REVENUE'
  | 'OPERATING_EXPENSE'
  | 'FINANCIAL_RESULT'
  | 'NON_OPERATING'
  | 'UNCLASSIFIED'

export interface DashboardFilters {
  period: string
  regime: ReportRegime
}

export interface DashboardSummaryRecord {
  key?: string
  title: string
  value: number
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

export interface FinancialDashboardData {
  regime: ReportRegime
  dateFrom: string
  dateTo: string
  cards: DashboardSummaryRecord[]
  cashFlowTotals: CashFlowReport['totals']
  delinquencyTotals: DelinquencyReport['totals']
}

export interface OperationalDashboardData {
  dateFrom: string
  dateTo: string
  cards: DashboardSummaryRecord[]
}

export interface ReportFilters {
  period: string
  regime: ReportRegime
  search: string
}

export interface ReportListItem {
  id: string
  label: string
  value: number | string
}

export interface ReportingFilters {
  regime: ReportRegime
  dateFrom: string
  dateTo: string
}

export interface ReportingDateRangeFilters {
  dateFrom: string
  dateTo: string
}

export interface CashFlowBucket {
  periodKey: string
  label: string
  realizedIncome: number
  realizedExpense: number
  realizedNet: number
  projectedIncome: number
  projectedExpense: number
  projectedNet: number
}

export interface CashFlowReport {
  regime: ReportRegime
  dateFrom: string
  dateTo: string
  buckets: CashFlowBucket[]
  totals: {
    realizedIncome: number
    realizedExpense: number
    realizedNet: number
    projectedIncome: number
    projectedExpense: number
    projectedNet: number
  }
}

export interface DelinquencyFilters {
  dateFrom: string
  dateTo: string
  referenceDate: string
}

export interface DelinquencyRecord {
  id: string
  description: string
  amount: number
  contactName: string | null
  accountName: string
  effectiveDueDate: string
  scheduledDueDate: string
  overdueDays: number
  temperature: DelinquencyTemperature
}

export interface DelinquencyReport {
  referenceDate: string
  dateFrom: string
  dateTo: string
  items: DelinquencyRecord[]
  totals: {
    count: number
    amount: number
    low: number
    medium: number
    high: number
  }
}

export interface DreCategoryRow {
  categoryId: string | null
  categoryName: string
  amount: number
}

export interface DreGroupRow {
  key: DreGroupKey
  label: string
  amount: number
  categories: DreCategoryRow[]
}

export interface DreReport {
  regime: ReportRegime
  dateFrom: string
  dateTo: string
  groups: DreGroupRow[]
  totals: {
    income: number
    expense: number
    net: number
  }
}

export interface ContractsReportItem {
  id: string
  title: string
  clientName: string
  status: ContractStatus
  startDate: string
  expectedEndDate: string | null
  finalAmount: number
  entriesCount: number
  renewedByCount: number
  renewalOfTitle: string | null
}

export interface ContractsReport {
  dateFrom: string
  dateTo: string
  items: ContractsReportItem[]
  totals: {
    total: number
    active: number
    renewed: number
    locked: number
    canceled: number
    closed: number
    proposals: number
    drafts: number
  }
}

export type { DashboardView, ReportRegime }
