import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { deleteFinancialEntry, getFinancialEntry } from '~~/server/utils/financial'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'lancamentos.delete')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  const before = await getFinancialEntry(id)
  await deleteFinancialEntry(id)

  await createAuditLog({
    eventType: 'FINANCIAL_ENTRY_DELETED',
    entityType: 'FinancialEntry',
    entityId: before.id,
    entityLabel: before.description,
    action: 'delete',
    actor,
    before,
    metadata: {
      softDelete: true,
    },
  })

  setResponseStatus(event, 204)
})
