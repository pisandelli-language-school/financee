import { requirePermission } from '~~/server/utils/auth'
import { generateContractsReport, parseDateRangeFilters } from '~~/server/utils/reporting'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'relatorios.view')

  const filters = parseDateRangeFilters(event)
  return await generateContractsReport(filters)
})
