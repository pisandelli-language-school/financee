import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/utils/auth'
import { normalizeString, parsePage, parsePageSize } from '~~/server/utils/auth-admin'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'permissoes.manage')

  const query = getQuery(event)
  const search = normalizeString(query.search).toLowerCase()
  const page = parsePage(query.page)
  const pageSize = parsePageSize(query.pageSize) || 50

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }
    : undefined

  const [items, total] = await Promise.all([
    prisma.role.findMany({
      where,
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
      orderBy: {
        name: 'asc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.role.count({ where }),
  ])

  return {
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      isSystem: item.isSystem,
      permissions: item.permissions.map(entry => entry.permission.key),
      usersCount: item._count.users,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  }
})
