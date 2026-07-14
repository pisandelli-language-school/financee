import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'usuarios.manage')

  const id = getRouterParam(event, 'id')
  const body = await readBody<{ internalRoleId?: string | null; isActive?: boolean }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Usuário inválido.',
    })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { internalRole: true },
  })

  if (!user || user.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Usuário não encontrado.',
    })
  }

  if (body.internalRoleId) {
    const role = await prisma.role.findUnique({
      where: { id: body.internalRoleId },
      select: { id: true },
    })

    if (!role) {
      throw createError({
        statusCode: 400,
        message: 'Papel interno inválido.',
      })
    }
  }

  const before = {
    internalRoleId: user.internalRoleId,
    internalRoleName: user.internalRole?.name ?? null,
    isActive: user.isActive,
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      internalRoleId: body.internalRoleId ?? null,
      isActive: body.isActive ?? user.isActive,
    },
    include: {
      internalRole: true,
    },
  })

  await createAuditLog({
    eventType: 'USER_UPDATED',
    entityType: 'User',
    entityId: updated.id,
    entityLabel: updated.name,
    action: 'update',
    actor,
    before,
    after: {
      internalRoleId: updated.internalRoleId,
      internalRoleName: updated.internalRole?.name ?? null,
      isActive: updated.isActive,
    },
    metadata: {
      changedFields: [
        ...(before.internalRoleId !== updated.internalRoleId ? ['internalRoleId'] : []),
        ...(before.isActive !== updated.isActive ? ['isActive'] : []),
      ],
    },
  })

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    avatarUrl: updated.avatarUrl,
    googleWorkspaceRole: updated.googleWorkspaceRole ?? 'STAFF',
    isWorkspaceAdmin: updated.isWorkspaceAdmin,
    internalRoleId: updated.internalRoleId,
    internalRoleName: updated.internalRole?.name ?? null,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    deletedAt: updated.deletedAt?.toISOString() ?? null,
  }
})
