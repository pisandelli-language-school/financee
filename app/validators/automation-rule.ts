import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import type { AutomationRuleFormValues } from '~/types/notifications'

const automationRuleSchema = z.object({
  isEnabled: z.boolean(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL'], {
    required_error: 'Selecione a severidade.',
  }),
  recipientRoles: z.array(z.string()).min(1, 'Selecione ao menos um destinatário.'),
  daysBeforeEnd: z.number().nullable(),
  daysAfterDue: z.number().nullable(),
  threshold: z.number().nullable(),
  graceDays: z.number().nullable(),
})

export const automationRuleValidationSchema = toTypedSchema(automationRuleSchema)

export function cloneAutomationRuleForm(values: AutomationRuleFormValues): AutomationRuleFormValues {
  return {
    ...values,
    recipientRoles: [...values.recipientRoles],
  }
}
