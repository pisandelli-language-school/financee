import { requirePermission } from '~~/server/utils/auth'
import { getFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'lancamentos.view')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  return await getFinancialEntry(id)
})
