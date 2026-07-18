import type { PaginatedResponse } from './backoffice'

export const entryDirectionOptions = [
  { label: 'Entrada', value: 'INCOME' },
  { label: 'Saída', value: 'EXPENSE' },
] as const

export const entryTypeOptions = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Estorno', value: 'ESTORNO' },
  { label: 'Ajuste', value: 'AJUSTE' },
  { label: 'Transferência', value: 'TRANSFER' },
] as const

export const manualEntryTypeOptions = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Estorno', value: 'ESTORNO' },
  { label: 'Ajuste', value: 'AJUSTE' },
] as const

export const entryStatusOptions = [
  { label: 'Em aberto', value: 'OPEN' },
  { label: 'Pago', value: 'PAID' },
  { label: 'Cancelado', value: 'CANCELED' },
] as const

export type EntryDirection = (typeof entryDirectionOptions)[number]['value']
export type EntryType = (typeof entryTypeOptions)[number]['value']
export type EntryStatus = (typeof entryStatusOptions)[number]['value']
export type ManualEntryType = (typeof manualEntryTypeOptions)[number]['value']

export interface FinancialEntryRecord {
  id: string
  direction: EntryDirection
  type: EntryType
  status: EntryStatus
  description: string
  amount: number
  competenceDate: string
  scheduledDueDate: string
  effectiveDueDate: string
  paymentDate: string | null
  accountId: string
  accountName: string
  paymentAccountId: string | null
  paymentAccountName: string | null
  categoryId: string | null
  categoryName: string | null
  subcategoryId: string | null
  subcategoryName: string | null
  costCenterId: string | null
  costCenterName: string | null
  contactId: string | null
  contactName: string | null
  tagIds: string[]
  tagNames: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface FinancialEntryFilters {
  search: string
  direction: EntryDirection | ''
  status: EntryStatus | ''
  accountId: string
  categoryId: string
  contactId: string
  dateFrom: string
  dateTo: string
  page: number
  pageSize: number
}

export interface FinancialEntryFormValues {
  direction: EntryDirection | ''
  type: EntryType | ''
  description: string
  amount: string
  competenceDate: string
  scheduledDueDate: string
  accountId: string
  transferTargetAccountId: string
  categoryId: string
  subcategoryId: string
  costCenterId: string
  contactId: string
  tagIds: string[]
  notes: string
}

export type FinancialEntryCreatePayload = FinancialEntryFormValues

export type FinancialEntryUpdatePayload = FinancialEntryFormValues

export interface FinancialEntryPaymentPayload {
  paymentDate: string
  paymentAccountId?: string
}

export type FinancialEntryListResponse = PaginatedResponse<FinancialEntryRecord>
