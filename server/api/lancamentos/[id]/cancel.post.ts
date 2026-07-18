import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { cancelFinancialEntry, getFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'lancamentos.cancel')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  const payload = await readBody(event)
  const before = await getFinancialEntry(id)
  const record = await cancelFinancialEntry(id, payload)

  await createAuditLog({
    eventType: 'FINANCIAL_ENTRY_CANCELED',
    entityType: 'FinancialEntry',
    entityId: record.id,
    entityLabel: record.description,
    action: 'cancel',
    actor,
    before,
    after: record,
    metadata: {
      scope: payload.scope ?? 'ONLY_THIS',
      recurrenceGroupId: before.recurrenceGroupId,
    },
  })

  return record
})
