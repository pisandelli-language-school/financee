import { requirePermission } from '~~/server/utils/auth'
import { deleteFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'lancamentos.delete')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  await deleteFinancialEntry(id)

  setResponseStatus(event, 204)
})
