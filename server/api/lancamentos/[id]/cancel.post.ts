import { requirePermission } from '~~/server/utils/auth'
import { cancelFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'lancamentos.cancel')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  return await cancelFinancialEntry(id)
})
