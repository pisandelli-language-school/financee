import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import type { UserAccessFormValues } from '~/types/auth'

const userAccessSchema = z.object({
  internalRoleId: z.string(),
  isActive: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.isActive && !value.internalRoleId.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['internalRoleId'],
      message: 'Selecione um papel interno ou desative o usuário.',
    })
  }
})

export const userAccessValidationSchema = toTypedSchema(userAccessSchema)

export function cloneUserAccessForm(form: UserAccessFormValues): UserAccessFormValues {
  return {
    ...form,
  }
}
