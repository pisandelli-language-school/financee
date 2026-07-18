import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { getFinancialEntry, markFinancialEntryAsOpen } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'lancamentos.pay')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  const before = await getFinancialEntry(id)
  const record = await markFinancialEntryAsOpen(id)

  await createAuditLog({
    eventType: 'FINANCIAL_ENTRY_REOPENED',
    entityType: 'FinancialEntry',
    entityId: record.id,
    entityLabel: record.description,
    action: 'reopen',
    actor,
    before,
    after: record,
  })

  return record
})
