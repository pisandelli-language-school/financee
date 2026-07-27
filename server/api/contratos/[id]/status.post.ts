import type { ContractStatus } from '~~/app/types/contracts'
import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { changeContractStatus, getContractById } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'contratos.update')
  const id = getRouterParam(event, 'id') || ''
  const payload = await readBody<{ status?: string }>(event)
  const before = await getContractById(id)
  const record = await changeContractStatus(id, String(payload.status ?? '') as ContractStatus)

  await createAuditLog({
    eventType: 'CONTRACT_STATUS_CHANGED',
    entityType: 'Contract',
    entityId: record.id,
    entityLabel: record.title,
    action: 'status.change',
    actor,
    before,
    after: record,
  })

  return record
})
