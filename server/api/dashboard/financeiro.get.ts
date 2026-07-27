import { requirePermission } from '~~/server/utils/auth'
import { generateFinancialDashboard, parseReportingFilters } from '~~/server/utils/reporting'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'dashboard.view')
  const filters = parseReportingFilters(event)

  return await generateFinancialDashboard(filters)
})
