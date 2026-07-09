import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  categoryTypeOptions,
  type CategoryFormValues,
  type CategoryType,
} from '~/types/backoffice'

const categoryTypeValues = categoryTypeOptions.map((option) => option.value) as [CategoryType, ...CategoryType[]]
const categoryTypeSet = new Set<string>(categoryTypeValues)

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nome da categoria é obrigatório.'),
  type: z.string(),
  dreGroup: z.string(),
  parentId: z.string(),
}).superRefine((value, ctx) => {
  if (!value.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['type'],
      message: 'Selecione um tipo para a categoria.',
    })
    return
  }

  if (!categoryTypeSet.has(value.type)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['type'],
      message: 'Selecione um tipo válido.',
    })
  }
})

export const categoryValidationSchema = toTypedSchema(categorySchema)

export function cloneCategoryForm(form: CategoryFormValues): CategoryFormValues {
  return {
    ...form,
  }
}
