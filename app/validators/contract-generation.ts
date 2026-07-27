import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import type { ContractGenerationFormValues, ContractRecord } from '~/types/contracts'

const contractGenerationSchema = z.object({
  description: z.string().trim().min(1, 'Informe a descrição base dos lançamentos.'),
  accountId: z.string().trim().min(1, 'Selecione a conta de destino.'),
  paymentMethodId: z.string(),
  categoryId: z.string().trim().min(1, 'Selecione a categoria.'),
  subcategoryId: z.string(),
  costCenterId: z.string(),
  firstDueDate: z.string().trim().min(1, 'Informe o primeiro vencimento.'),
  notes: z.string(),
})

export const contractGenerationValidationSchema = toTypedSchema(contractGenerationSchema)

export function createContractGenerationForm(record: ContractRecord): ContractGenerationFormValues {
  return {
    description: record.title,
    accountId: '',
    paymentMethodId: '',
    categoryId: '',
    subcategoryId: '',
    costCenterId: '',
    firstDueDate: record.firstDueDate ?? record.startDate,
    notes: record.notes ?? '',
  }
}

export function cloneContractGenerationForm(values: ContractGenerationFormValues): ContractGenerationFormValues {
  return {
    ...values,
  }
}
