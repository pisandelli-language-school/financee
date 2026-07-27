import type { PaginatedResponse, PagedFilters } from './backoffice'

export const contractStatusOptions = [
  { label: 'Rascunho', value: 'DRAFT' },
  { label: 'Proposta', value: 'PROPOSAL' },
  { label: 'Ativo', value: 'ACTIVE' },
  { label: 'Renovado', value: 'RENEWED' },
  { label: 'Encerrado', value: 'CLOSED' },
  { label: 'Cancelado', value: 'CANCELED' },
  { label: 'Trancado', value: 'LOCKED' },
] as const

export const contractSourceOptions = [
  { label: 'Local', value: 'LOCAL' },
  { label: 'Classtime', value: 'CLASSTIME' },
  { label: 'Externo', value: 'EXTERNAL' },
] as const

export const contractBillingModelOptions = [
  { label: 'À vista', value: 'CASH' },
  { label: 'Parcelado', value: 'INSTALLMENT' },
  { label: 'Recorrente', value: 'RECURRING' },
] as const

export const contractBillingFrequencyOptions = [
  { label: 'Mensal', value: 'MONTHLY' },
  { label: 'Trimestral', value: 'QUARTERLY' },
  { label: 'Semestral', value: 'SEMIANNUAL' },
  { label: 'Anual', value: 'ANNUAL' },
] as const

export type ContractStatus = (typeof contractStatusOptions)[number]['value']
export type ContractSource = (typeof contractSourceOptions)[number]['value']
export type ContractBillingModel = (typeof contractBillingModelOptions)[number]['value']
export type ContractBillingFrequency = (typeof contractBillingFrequencyOptions)[number]['value']

export interface ContractFilters extends PagedFilters {
  status: ContractStatus | ''
  clientId: string
}

export interface ContractRecord {
  id: string
  title: string
  clientId: string
  clientName: string
  status: ContractStatus
  originalAmount: number
  discountAmount: number | null
  finalAmount: number
  totalHours: number | null
  weeklyHours: number | null
  startDate: string
  expectedEndDate: string | null
  billingModel: ContractBillingModel
  billingFrequency: ContractBillingFrequency | null
  billingOccurrences: number | null
  firstDueDate: string | null
  paymentConditionId: string | null
  paymentConditionName: string | null
  notes: string | null
  externalContractId: string | null
  source: ContractSource
  renewalOfContractId: string | null
  renewalOfTitle: string | null
  renewedByCount: number
  entriesCount: number
  createdAt: string
  updatedAt: string
}

export interface ContractFormValues {
  title: string
  clientId: string
  status: ContractStatus
  originalAmount: string
  discountAmount: string
  finalAmount: string
  totalHours: string
  weeklyHours: string
  startDate: string
  expectedEndDate: string
  billingModel: ContractBillingModel
  billingFrequency: ContractBillingFrequency | ''
  billingOccurrences: string
  firstDueDate: string
  notes: string
  externalContractId: string
}

export interface ContractHistoryRecord {
  id: string
  title: string
  status: ContractStatus
  startDate: string
  expectedEndDate: string | null
  relation: 'CURRENT' | 'PREVIOUS' | 'NEXT'
}

export type ContractListResponse = PaginatedResponse<ContractRecord>

export interface ContractHistoryResponse {
  items: ContractHistoryRecord[]
}

export interface ContractGenerationFormValues {
  description: string
  accountId: string
  paymentMethodId: string
  categoryId: string
  subcategoryId: string
  costCenterId: string
  firstDueDate: string
  notes: string
}

export interface ContractGenerationPreviewItem {
  index: number
  amount: number
  scheduledDueDate: string
}

export interface ContractGenerationResponse {
  count: number
  firstEntryId: string | null
  recurrenceGroupId: string | null
}
