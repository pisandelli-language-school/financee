export const categoryTypeOptions = [
  { label: 'Entrada', value: 'INCOME' },
  { label: 'Saída', value: 'EXPENSE' },
  { label: 'Outros', value: 'OTHER' },
] as const

export const dreGroupOptions = [
  { label: 'Receita operacional', value: 'OPERATING_REVENUE' },
  { label: 'Despesa operacional', value: 'OPERATING_EXPENSE' },
  { label: 'Resultado financeiro', value: 'FINANCIAL_RESULT' },
  { label: 'Não operacional', value: 'NON_OPERATING' },
] as const

export const contactRoleOptions = [
  { label: 'Cliente', value: 'CLIENT' },
  { label: 'Fornecedor', value: 'SUPPLIER' },
  { label: 'Outro', value: 'OTHER' },
] as const

export const contactNatureOptions = [
  { label: 'Pessoa física', value: 'INDIVIDUAL' },
  { label: 'Pessoa jurídica', value: 'COMPANY' },
  { label: 'Estrangeiro', value: 'FOREIGN' },
] as const

export const documentTypeOptions = [
  { label: 'CPF', value: 'CPF' },
  { label: 'CNPJ', value: 'CNPJ' },
  { label: 'Documento estrangeiro', value: 'FOREIGN_DOCUMENT' },
] as const

export const nonBusinessDayTypeOptions = [
  { label: 'Fixo anual', value: 'FIXED' },
  { label: 'Calculado', value: 'CALCULATED' },
  { label: 'Personalizado', value: 'CUSTOM' },
] as const

export const nonBusinessDayRuleOptions = [
  { label: 'Carnaval', value: 'EASTER_MINUS_47' },
  { label: 'Sexta-feira Santa', value: 'EASTER_MINUS_2' },
  { label: 'Corpus Christi', value: 'EASTER_PLUS_60' },
] as const

export const nonBusinessDayScopeOptions = [
  { label: 'Nacional', value: 'NATIONAL' },
  { label: 'Estadual', value: 'STATE' },
  { label: 'Municipal', value: 'CITY' },
  { label: 'Interno', value: 'INTERNAL' },
] as const

export type CategoryType = (typeof categoryTypeOptions)[number]['value']
export type DREGroup = (typeof dreGroupOptions)[number]['value']
export type ContactRole = (typeof contactRoleOptions)[number]['value']
export type ContactNature = (typeof contactNatureOptions)[number]['value']
export type ContactDocumentType = (typeof documentTypeOptions)[number]['value']
export type NonBusinessDayType = (typeof nonBusinessDayTypeOptions)[number]['value']
export type NonBusinessDayRule = (typeof nonBusinessDayRuleOptions)[number]['value']
export type NonBusinessDayScope = (typeof nonBusinessDayScopeOptions)[number]['value']

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PagedFilters {
  search: string
  page: number
  pageSize: number
}

export interface CategoryFilters extends PagedFilters {
  type: CategoryType | ''
}

export interface ContactFilters extends PagedFilters {
  nature: ContactNature | ''
  role: ContactRole | ''
}

export interface NonBusinessDayFilters extends PagedFilters {
  type: NonBusinessDayType | ''
}

export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export interface CategoryRecord extends BaseRecord {
  name: string
  type: CategoryType
  dreGroup: DREGroup | null
  parentId: string | null
  parentName: string | null
  subcategoryCount: number
}

export interface AccountRecord extends BaseRecord {
  name: string
  type: string
  initialValue: number | null
  isActive: boolean
}

export interface CostCenterRecord extends BaseRecord {
  name: string
  isActive: boolean
}

export interface TagRecord extends BaseRecord {
  name: string
  bgColor: string | null
  textColor: string | null
}

export interface PaymentMethodRecord extends BaseRecord {
  name: string
  isActive: boolean
}

export interface ContactAddressRecord {
  country: string
  state: string
  city: string
  postalCode: string
  street: string
  number: string
  complement: string
  district: string
}

export interface ContactFinancialResponsibleRecord {
  name: string
  email: string
  phone: string
  role: string
}

export interface ContactRecord extends BaseRecord {
  name: string
  tradeName: string | null
  document: string | null
  documentType: ContactDocumentType | null
  nature: ContactNature
  roles: ContactRole[]
  birthDate: string | null
  municipalRegistration: string | null
  email: string | null
  phone: string | null
  address: ContactAddressRecord | null
  financialResponsible: ContactFinancialResponsibleRecord | null
  notes: string | null
  isActive: boolean
}

export interface NonBusinessDayRecord extends BaseRecord {
  title: string
  type: NonBusinessDayType
  month: number | null
  day: number | null
  rule: NonBusinessDayRule | null
  date: string | null
  scope: NonBusinessDayScope | null
  notes: string | null
  description: string
}

export interface CategoryFormValues {
  name: string
  type: CategoryType
  dreGroup: DREGroup | ''
  parentId: string
}

export interface SimpleCatalogFormValues {
  name: string
  type?: string
  initialValue?: number | null
  isActive: boolean
}

export interface TagFormValues {
  name: string
  bgColor: string
  textColor: string
}

export interface ContactFormValues {
  name: string
  tradeName: string
  document: string
  documentType: ContactDocumentType | ''
  nature: ContactNature
  roles: ContactRole[]
  birthDate: string
  municipalRegistration: string
  email: string
  phone: string
  notes: string
  isActive: boolean
  address: ContactAddressRecord
  financialResponsible: ContactFinancialResponsibleRecord
}

export interface NonBusinessDayFormValues {
  title: string
  type: NonBusinessDayType
  month: number | null
  day: number | null
  rule: NonBusinessDayRule | ''
  date: string
  scope: NonBusinessDayScope | ''
  notes: string
}

export interface ConfigCard {
  title: string
  description: string
  to?: string
  icon: string
  disabled?: boolean
  badge?: string
}

export interface DeleteBlockReason {
  title: string
  description: string
}

export interface AppTableColumn {
  key: string
  title?: string
  align?: 'left' | 'center' | 'right'
  width?: string
}
