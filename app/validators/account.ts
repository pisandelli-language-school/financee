import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import type { AccountFormValues, AccountRecord } from '~/types/backoffice'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Nome da conta é obrigatório.'),
  type: z.string(),
  initialValue: z.number().nullable(),
  institutionId: z.string(),
  alertOnLowBalance: z.boolean(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  notes: z.string(),
  isActive: z.boolean(),
}).superRefine((value, ctx) => {
  if (!value.type.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['type'],
      message: 'Selecione o tipo da conta.',
    })
  }

  if (value.contactEmail.trim() && !isValidEmail(value.contactEmail.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contactEmail'],
      message: 'Informe um e-mail válido.',
    })
  }
})

export const accountValidationSchema = toTypedSchema(accountSchema)

export function cloneAccountForm(form: AccountFormValues): AccountFormValues {
  return {
    ...form,
  }
}

export function createAccountFormFromRecord(record: AccountRecord): AccountFormValues {
  return {
    name: record.name,
    type: record.type,
    initialValue: record.initialValue ?? null,
    institutionId: record.institutionId ?? '',
    alertOnLowBalance: record.alertOnLowBalance,
    contactPhone: record.contactPhone ?? '',
    contactEmail: record.contactEmail ?? '',
    notes: record.notes ?? '',
    isActive: record.isActive,
  }
}
