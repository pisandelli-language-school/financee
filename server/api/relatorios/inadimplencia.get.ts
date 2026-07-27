import { requirePermission } from '~~/server/utils/auth'
import { generateDelinquencyReport, parseDelinquencyFilters } from '~~/server/utils/reporting'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'relatorios.view')

  const filters = parseDelinquencyFilters(event)
  return await generateDelinquencyReport(filters)
})
