import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  contractBillingFrequencyOptions,
  contractBillingModelOptions,
  contractStatusOptions,
  type ContractBillingFrequency,
  type ContractBillingModel,
  type ContractFormValues,
  type ContractRecord,
  type ContractStatus,
} from '~/types/contracts'
import { formatCurrencyInput, sanitizePercentInput } from '~/utils/number-input'

const contractStatusValues = contractStatusOptions.map(option => option.value) as [ContractStatus, ...ContractStatus[]]
const contractBillingModelValues = contractBillingModelOptions.map(option => option.value) as [ContractBillingModel, ...ContractBillingModel[]]
const contractBillingFrequencyValues = contractBillingFrequencyOptions.map(option => option.value) as [ContractBillingFrequency, ...ContractBillingFrequency[]]

const contractStatusSet = new Set<string>(contractStatusValues)
const contractBillingModelSet = new Set<string>(contractBillingModelValues)
const contractBillingFrequencySet = new Set<string>(contractBillingFrequencyValues)

const contractSchema = z.object({
  title: z.string().trim().min(1, 'Título do contrato é obrigatório.'),
  clientId: z.string(),
  status: z.string(),
  originalAmount: z.string(),
  discountAmount: z.string(),
  finalAmount: z.string(),
  totalHours: z.string(),
  weeklyHours: z.string(),
  startDate: z.string(),
  expectedEndDate: z.string(),
  billingModel: z.string(),
  billingFrequency: z.string(),
  billingOccurrences: z.string(),
  firstDueDate: z.string(),
  notes: z.string(),
  externalContractId: z.string(),
}).superRefine((value, ctx) => {
  if (!value.clientId.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clientId'],
      message: 'Selecione o cliente do contrato.',
    })
  }

  if (!contractStatusSet.has(value.status)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'Selecione um status válido.',
    })
  }

  if (!value.startDate.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startDate'],
      message: 'Informe a data de início.',
    })
  }

  if (!value.originalAmount.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['originalAmount'],
      message: 'Informe o valor original.',
    })
  }

  if (!contractBillingModelSet.has(value.billingModel)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['billingModel'],
      message: 'Selecione uma modalidade de cobrança válida.',
    })
  }

  if (value.billingModel !== 'CASH') {
    if (!value.billingFrequency.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billingFrequency'],
        message: 'Selecione a frequência de cobrança.',
      })
    } else if (!contractBillingFrequencySet.has(value.billingFrequency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billingFrequency'],
        message: 'Selecione uma frequência válida.',
      })
    }

    if (!value.billingOccurrences.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billingOccurrences'],
        message: value.billingModel === 'INSTALLMENT'
          ? 'Informe o número de parcelas.'
          : 'Informe o número de recorrências.',
      })
    } else {
      const occurrences = Number(value.billingOccurrences)

      if (!Number.isInteger(occurrences) || occurrences < 2 || occurrences > 120) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingOccurrences'],
          message: 'Informe um valor inteiro entre 2 e 120.',
        })
      }
    }
  }
})

export const contractValidationSchema = toTypedSchema(contractSchema)

export function cloneContractForm(form: ContractFormValues): ContractFormValues {
  return {
    ...form,
  }
}

export function createContractFormFromRecord(record: ContractRecord): ContractFormValues {
  return {
    title: record.title,
    clientId: record.clientId,
    status: record.status,
    originalAmount: formatCurrencyInput(record.originalAmount),
    discountAmount: record.discountAmount == null ? '' : sanitizePercentInput(String(record.discountAmount)),
    finalAmount: formatCurrencyInput(record.finalAmount),
    totalHours: record.totalHours == null ? '' : String(record.totalHours),
    weeklyHours: record.weeklyHours == null ? '' : String(record.weeklyHours),
    startDate: record.startDate,
    expectedEndDate: record.expectedEndDate ?? '',
    billingModel: record.billingModel,
    billingFrequency: record.billingFrequency ?? '',
    billingOccurrences: record.billingOccurrences == null ? '' : String(record.billingOccurrences),
    firstDueDate: record.firstDueDate ?? '',
    notes: record.notes ?? '',
    externalContractId: record.externalContractId ?? '',
  }
}
