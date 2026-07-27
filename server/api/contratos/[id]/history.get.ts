import { requirePermission } from '~~/server/utils/auth'
import { getContractHistory } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'contratos.view')

  return await getContractHistory(getRouterParam(event, 'id') || '')
})
