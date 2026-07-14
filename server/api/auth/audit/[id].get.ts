import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'auditoria.view')

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Registro de auditoria inválido.',
    })
  }

  const auditLog = await prisma.auditLog.findUnique({
    where: { id },
  })

  if (!auditLog) {
    throw createError({
      statusCode: 404,
      message: 'Registro de auditoria não encontrado.',
    })
  }

  return {
    id: auditLog.id,
    severity: auditLog.severity,
    eventType: auditLog.eventType,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    entityLabel: auditLog.entityLabel,
    action: auditLog.action,
    userId: auditLog.userId,
    userEmail: auditLog.userEmail,
    createdAt: auditLog.createdAt.toISOString(),
    metadata: auditLog.metadata as Record<string, unknown> | null,
    before: auditLog.before as Record<string, unknown> | null,
    after: auditLog.after as Record<string, unknown> | null,
  }
})
