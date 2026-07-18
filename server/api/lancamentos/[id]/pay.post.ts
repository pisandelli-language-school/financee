import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { getFinancialEntry, markFinancialEntryAsPaid } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'lancamentos.pay')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  const payload = await readBody(event)
  const before = await getFinancialEntry(id)
  const record = await markFinancialEntryAsPaid(id, payload)

  await createAuditLog({
    eventType: 'FINANCIAL_ENTRY_PAID',
    entityType: 'FinancialEntry',
    entityId: record.id,
    entityLabel: record.description,
    action: 'pay',
    actor,
    before,
    after: record,
  })

  return record
})
