import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  entryDirectionOptions,
  entryTypeOptions,
  type EntryDirection,
  type EntryType,
  type FinancialEntryFormValues,
  type FinancialEntryRecord,
  recurrenceFrequencyOptions,
  recurrenceTypeOptions,
  type RecurrenceFrequency,
  type RecurrenceType,
} from '~/types/financial'

const entryDirectionValues = entryDirectionOptions.map((option) => option.value) as [EntryDirection, ...EntryDirection[]]
const entryTypeValues = entryTypeOptions.map((option) => option.value) as [EntryType, ...EntryType[]]
const recurrenceTypeValues = recurrenceTypeOptions.map((option) => option.value) as [RecurrenceType, ...RecurrenceType[]]
const recurrenceFrequencyValues = recurrenceFrequencyOptions.map((option) => option.value) as [RecurrenceFrequency, ...RecurrenceFrequency[]]
const entryDirectionSet = new Set<string>(entryDirectionValues)
const entryTypeSet = new Set<string>(entryTypeValues)
const recurrenceTypeSet = new Set<string>(recurrenceTypeValues)
const recurrenceFrequencySet = new Set<string>(recurrenceFrequencyValues)

function isValidDateOnly(value: string) {
  if (!value) {
    return false
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).valueOf())
}

export const financialEntrySchema = z.object({
  direction: z.string(),
  type: z.string(),
  description: z.string().trim().min(1, 'Descrição é obrigatória.'),
  amount: z.string(),
  competenceDate: z.string(),
  scheduledDueDate: z.string(),
  accountId: z.string(),
  transferTargetAccountId: z.string(),
  paymentMethodId: z.string(),
  categoryId: z.string(),
  subcategoryId: z.string(),
  costCenterId: z.string(),
  contactId: z.string(),
  tagIds: z.array(z.string()),
  recurrenceType: z.string(),
  recurrenceFrequency: z.string(),
  recurrenceTotal: z.string(),
  notes: z.string(),
}).superRefine((value, ctx) => {
  const isTransfer = value.type === 'TRANSFER'

  if (!isTransfer && !value.direction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['direction'],
      message: 'Selecione a direção do lançamento.',
    })
  } else if (value.direction && !entryDirectionSet.has(value.direction)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['direction'],
      message: 'Selecione uma direção válida.',
    })
  }

  if (!value.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['type'],
      message: 'Selecione o tipo do lançamento.',
    })
  } else if (!entryTypeSet.has(value.type)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['type'],
      message: 'Selecione um tipo válido.',
    })
  }

  const amount = Number(value.amount)

  if (!value.amount.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'Informe o valor do lançamento.',
    })
  } else if (!Number.isFinite(amount) || amount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'Informe um valor maior que zero.',
    })
  }

  if (!value.accountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accountId'],
      message: isTransfer ? 'Selecione a conta de origem.' : 'Selecione a conta prevista.',
    })
  }

  if (isTransfer && !value.transferTargetAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['transferTargetAccountId'],
      message: 'Selecione a conta de destino.',
    })
  }

  if (isTransfer && value.accountId && value.transferTargetAccountId && value.accountId === value.transferTargetAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['transferTargetAccountId'],
      message: 'A conta de destino deve ser diferente da origem.',
    })
  }

  if (!isTransfer && !value.categoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categoryId'],
      message: 'Selecione a categoria.',
    })
  }

  if (!isValidDateOnly(value.competenceDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['competenceDate'],
      message: 'Informe uma competência válida.',
    })
  }

  if (!isValidDateOnly(value.scheduledDueDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduledDueDate'],
      message: 'Informe um vencimento válido.',
    })
  }

  if (!isTransfer && value.subcategoryId && !value.categoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['subcategoryId'],
      message: 'Selecione uma categoria antes da subcategoria.',
    })
  }

  if (!value.recurrenceType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrenceType'],
      message: 'Selecione como o lançamento se repete.',
    })
  } else if (!recurrenceTypeSet.has(value.recurrenceType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrenceType'],
      message: 'Selecione uma repetição válida.',
    })
  }

  if (value.recurrenceType !== 'ONE_TIME') {
    if (!value.recurrenceFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrenceFrequency'],
        message: 'Selecione a frequência.',
      })
    } else if (!recurrenceFrequencySet.has(value.recurrenceFrequency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrenceFrequency'],
        message: 'Selecione uma frequência válida.',
      })
    }

    const recurrenceTotal = Number(value.recurrenceTotal)

    if (value.recurrenceType === 'FIXED' && !value.recurrenceTotal.trim()) {
      return
    }

    if (!value.recurrenceTotal.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrenceTotal'],
        message: 'Informe o número de parcelas.',
      })
    } else if (!Number.isInteger(recurrenceTotal) || recurrenceTotal < 2 || recurrenceTotal > 120) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrenceTotal'],
        message: 'Informe um número entre 2 e 120.',
      })
    }
  }
})

export const financialEntryValidationSchema = toTypedSchema(financialEntrySchema)

export function createFinancialEntryForm(): FinancialEntryFormValues {
  const today = new Date().toISOString().slice(0, 10)

  return {
    direction: '',
    type: 'NORMAL',
    description: '',
    amount: '',
    competenceDate: today,
    scheduledDueDate: today,
    accountId: '',
    transferTargetAccountId: '',
    paymentMethodId: '',
    categoryId: '',
    subcategoryId: '',
    costCenterId: '',
    contactId: '',
    tagIds: [],
    recurrenceType: 'ONE_TIME',
    recurrenceFrequency: 'MONTHLY',
    recurrenceTotal: '',
    notes: '',
  }
}

export function cloneFinancialEntryForm(form: FinancialEntryFormValues): FinancialEntryFormValues {
  return {
    ...form,
  }
}

export function createFinancialEntryFormFromRecord(record: FinancialEntryRecord): FinancialEntryFormValues {
  return {
    direction: record.direction,
    type: record.type === 'TRANSFER' ? 'NORMAL' : record.type,
    description: record.description,
    amount: String(record.amount),
    competenceDate: record.competenceDate,
    scheduledDueDate: record.scheduledDueDate,
    accountId: record.accountId,
    transferTargetAccountId: '',
    paymentMethodId: record.paymentMethodId ?? '',
    categoryId: record.categoryId ?? '',
    subcategoryId: record.subcategoryId ?? '',
    costCenterId: record.costCenterId ?? '',
    contactId: record.contactId ?? '',
    tagIds: [...record.tagIds],
    recurrenceType: record.recurrenceType ?? 'ONE_TIME',
    recurrenceFrequency: record.recurrenceFrequency ?? 'MONTHLY',
    recurrenceTotal: record.recurrenceTotal ? String(record.recurrenceTotal) : '',
    notes: record.notes ?? '',
  }
}
