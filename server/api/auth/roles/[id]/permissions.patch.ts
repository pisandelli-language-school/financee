import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'permissoes.manage')

  const id = getRouterParam(event, 'id')
  const body = await readBody<{ permissionKeys?: string[] }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Papel inválido.',
    })
  }

  const role = await prisma.role.findUnique({
    where: { id },
  })

  if (!role) {
    throw createError({
      statusCode: 404,
      message: 'Papel não encontrado.',
    })
  }

  const permissionKeys = Array.isArray(body.permissionKeys) ? body.permissionKeys : []
  const previousPermissions = await prisma.rolePermission.findMany({
    where: { roleId: id },
    include: {
      permission: true,
    },
  })
  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: permissionKeys,
      },
    },
  })

  if (permissions.length !== permissionKeys.length) {
    throw createError({
      statusCode: 400,
      message: 'Uma ou mais permissões são inválidas.',
    })
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId: id },
  })

  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map(permission => ({
        roleId: id,
        permissionId: permission.id,
      })),
    })
  }

  const updated = await prisma.role.findUniqueOrThrow({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  })

  const previousPermissionKeys = previousPermissions.map(entry => entry.permission.key).sort()
  const nextPermissionKeys = updated.permissions.map(entry => entry.permission.key).sort()

  await createAuditLog({
    eventType: 'ROLE_PERMISSIONS_UPDATED',
    entityType: 'Role',
    entityId: updated.id,
    entityLabel: updated.name,
    action: 'assign_permissions',
    actor,
    before: {
      permissionKeys: previousPermissionKeys,
    },
    after: {
      permissionKeys: nextPermissionKeys,
    },
    metadata: {
      added: nextPermissionKeys.filter(key => !previousPermissionKeys.includes(key)),
      removed: previousPermissionKeys.filter(key => !nextPermissionKeys.includes(key)),
    },
  })

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    isSystem: updated.isSystem,
    permissions: updated.permissions.map(entry => entry.permission.key),
    usersCount: updated._count.users,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  }
})
