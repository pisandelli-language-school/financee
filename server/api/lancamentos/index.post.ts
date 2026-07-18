import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { createFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'lancamentos.create')

  const payload = await readBody(event)
  const record = await createFinancialEntry(payload)

  await createAuditLog({
    eventType: 'FINANCIAL_ENTRY_CREATED',
    entityType: 'FinancialEntry',
    entityId: record.id,
    entityLabel: record.description,
    action: 'create',
    actor,
    after: record,
    metadata: {
      recurrenceGroupId: record.recurrenceGroupId,
      recurrenceType: record.recurrenceType,
      recurrenceTotal: record.recurrenceTotal,
    },
  })

  return record
})
