import { requirePermission } from '~~/server/utils/auth'
import { generateOperationalDashboard, parseDateRangeFilters } from '~~/server/utils/reporting'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'dashboard.view')
  const filters = parseDateRangeFilters(event)

  return await generateOperationalDashboard(filters)
})
