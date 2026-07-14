import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/utils/auth'
import { normalizeString, parsePage, parsePageSize } from '~~/server/utils/auth-admin'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'usuarios.manage')

  const query = getQuery(event)
  const search = normalizeString(query.search).toLowerCase()
  const page = parsePage(query.page)
  const pageSize = parsePageSize(query.pageSize) || 50

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        internalRole: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return {
    items: items.map(item => ({
      id: item.id,
      email: item.email,
      name: item.name,
      avatarUrl: item.avatarUrl,
      googleWorkspaceRole: item.googleWorkspaceRole ?? 'STAFF',
      isWorkspaceAdmin: item.isWorkspaceAdmin,
      internalRoleId: item.internalRoleId,
      internalRoleName: item.internalRole?.name ?? null,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      deletedAt: item.deletedAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
  }
})
