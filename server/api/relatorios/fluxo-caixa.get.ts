import { requirePermission } from '~~/server/utils/auth'
import { generateCashFlow, parseReportingFilters } from '~~/server/utils/reporting'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'relatorios.view')

  const filters = parseReportingFilters(event)
  return await generateCashFlow(filters)
})
