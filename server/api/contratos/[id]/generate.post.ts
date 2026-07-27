import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { generateContractEntries, getContractById } from '~~/server/utils/contracts'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'contratos.generate')
  const id = getRouterParam(event, 'id') || ''
  const before = await getContractById(id)
  const payload = await readBody(event)
  const result = await generateContractEntries(id, payload)
  const after = await getContractById(id)

  await createAuditLog({
    eventType: 'CONTRACT_ENTRIES_GENERATED',
    entityType: 'Contract',
    entityId: after.id,
    entityLabel: after.title,
    action: 'generate.entries',
    actor,
    before,
    after,
    metadata: result,
  })

  return result
})
