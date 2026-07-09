import type {
  CategoryFormValues,
  CategoryRecord,
  ContactAddressRecord,
  ContactFinancialResponsibleRecord,
  ContactFormValues,
  ContactRecord,
  NonBusinessDayFormValues,
  NonBusinessDayRecord,
  SimpleCatalogFormValues,
  TagFormValues,
  TagRecord,
} from '~/types/backoffice'

export function createEmptyCategoryForm(): CategoryFormValues {
  return {
    name: '',
    type: '',
    dreGroup: '',
    parentId: '',
    isActive: true,
  }
}

export function categoryToForm(record: CategoryRecord): CategoryFormValues {
  return {
    name: record.name,
    type: record.type,
    dreGroup: record.dreGroup ?? '',
    parentId: record.parentId ?? '',
    isActive: record.isActive,
  }
}

export function createEmptySimpleForm(): SimpleCatalogFormValues {
  return {
    name: '',
    type: '',
    initialValue: null,
    isActive: true,
  }
}

export function simpleRecordToForm(record: {
  name: string
  type?: string
  initialValue?: number | null
  isActive: boolean
}): SimpleCatalogFormValues {
  return {
    name: record.name,
    type: record.type ?? '',
    initialValue: record.initialValue ?? null,
    isActive: record.isActive,
  }
}

export function createEmptyTagForm(): TagFormValues {
  return {
    name: '',
    bgColor: '',
    textColor: '',
    isActive: true,
  }
}

export function tagToForm(record: TagRecord): TagFormValues {
  return {
    name: record.name,
    bgColor: record.bgColor ?? '',
    textColor: record.textColor ?? '',
    isActive: record.isActive,
  }
}

function createEmptyAddress(): ContactAddressRecord {
  return {
    country: 'BRASIL',
    state: '',
    city: '',
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
  }
}

function createEmptyFinancialResponsible(): ContactFinancialResponsibleRecord {
  return {
    name: '',
    email: '',
    phone: '',
    role: '',
  }
}

export function createEmptyContactForm(): ContactFormValues {
  return {
    name: '',
    tradeName: '',
    document: '',
    documentType: '',
    nature: 'INDIVIDUAL',
    roles: [],
    birthDate: '',
    municipalRegistration: '',
    email: '',
    phone: '',
    notes: '',
    isActive: true,
    address: createEmptyAddress(),
    financialResponsible: createEmptyFinancialResponsible(),
  }
}

export function contactToForm(record: ContactRecord): ContactFormValues {
  return {
    name: record.name,
    tradeName: record.tradeName ?? '',
    document: record.document ?? '',
    documentType: record.documentType ?? '',
    nature: record.nature,
    roles: [...record.roles],
    birthDate: record.birthDate ?? '',
    municipalRegistration: record.municipalRegistration ?? '',
    email: record.email ?? '',
    phone: record.phone ?? '',
    notes: record.notes ?? '',
    isActive: record.isActive,
    address: record.address ?? createEmptyAddress(),
    financialResponsible: record.financialResponsible ?? createEmptyFinancialResponsible(),
  }
}

export function createEmptyNonBusinessDayForm(): NonBusinessDayFormValues {
  return {
    title: '',
    type: 'FIXED',
    month: null,
    day: null,
    rule: '',
    date: '',
    scope: '',
    notes: '',
    isActive: true,
  }
}

export function nonBusinessDayToForm(record: NonBusinessDayRecord): NonBusinessDayFormValues {
  return {
    title: record.title,
    type: record.type,
    month: record.month,
    day: record.day,
    rule: record.rule ?? '',
    date: record.date ?? '',
    scope: record.scope ?? '',
    notes: record.notes ?? '',
    isActive: record.isActive,
  }
}
