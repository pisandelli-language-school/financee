import { requirePermission } from '~~/server/utils/auth'
import { updateFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'lancamentos.update')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  const payload = await readBody(event)

  return await updateFinancialEntry(id, payload)
})
