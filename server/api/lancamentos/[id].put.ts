import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { getFinancialEntry, updateFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'lancamentos.update')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  const payload = await readBody(event)
  const before = await getFinancialEntry(id)
  const record = await updateFinancialEntry(id, payload)

  await createAuditLog({
    eventType: 'FINANCIAL_ENTRY_UPDATED',
    entityType: 'FinancialEntry',
    entityId: record.id,
    entityLabel: record.description,
    action: 'update',
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
