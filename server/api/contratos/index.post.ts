import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { createContract } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'contratos.create')

  const payload = await readBody(event)
  const record = await createContract(payload)

  await createAuditLog({
    eventType: 'CONTRACT_CREATED',
    entityType: 'Contract',
    entityId: record.id,
    entityLabel: record.title,
    action: 'create',
    actor,
    after: record,
  })

  return record
})
