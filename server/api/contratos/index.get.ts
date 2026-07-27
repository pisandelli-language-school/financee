import { requirePermission } from '~~/server/utils/auth'
import { listContracts, parseContractFilters } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'contratos.view')

  const filters = parseContractFilters(event)
  return await listContracts(filters)
})
