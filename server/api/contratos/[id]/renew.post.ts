import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { getContractById, renewContract } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'contratos.renew')
  const id = getRouterParam(event, 'id') || ''
  const payload = await readBody(event)
  const before = await getContractById(id)
  const record = await renewContract(id, payload)

  await createAuditLog({
    eventType: 'CONTRACT_RENEWED',
    entityType: 'Contract',
    entityId: record.id,
    entityLabel: record.title,
    action: 'renew',
    actor,
    before,
    after: record,
    metadata: {
      renewalOfContractId: id,
    },
  })

  return record
})
