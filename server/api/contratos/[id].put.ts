import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { getContractById, updateContract } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'contratos.update')
  const id = getRouterParam(event, 'id') || ''
  const before = await getContractById(id)
  const payload = await readBody(event)
  const record = await updateContract(id, payload)

  await createAuditLog({
    eventType: 'CONTRACT_UPDATED',
    entityType: 'Contract',
    entityId: record.id,
    entityLabel: record.title,
    action: 'update',
    actor,
    before,
    after: record,
  })

  return record
})
