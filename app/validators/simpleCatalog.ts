import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
interface SimpleCatalogValidationOptions {
  requireType?: boolean
}

export function createSimpleCatalogValidationSchema(options: SimpleCatalogValidationOptions = {}) {
  const schema = z.object({
    name: z.string().trim().min(1, 'Nome é obrigatório.'),
    type: z.string(),
    initialValue: z.number().nullable().optional(),
    isActive: z.boolean(),
  }).superRefine((value, ctx) => {
    if (options.requireType && !value.type.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Selecione um tipo.',
      })
    }
  })

  return toTypedSchema(schema)
}
