import { requirePermission } from '~~/server/utils/auth'
import { getContractById } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'contratos.view')

  return await getContractById(getRouterParam(event, 'id') || '')
})
