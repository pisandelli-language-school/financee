import { requirePermission } from '~~/server/utils/auth'
import {
  parseFinancialEntryFilters,
  summarizeFinancialEntries,
} from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'lancamentos.view')

  const filters = parseFinancialEntryFilters(event)
  return await summarizeFinancialEntries(filters)
})
