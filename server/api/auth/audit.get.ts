import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/utils/auth'
import { normalizeString, parsePage, parsePageSize } from '~~/server/utils/auth-admin'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'auditoria.view')

  const query = getQuery(event)
  const search = normalizeString(query.search).toLowerCase()
  const severity = normalizeString(query.severity).toUpperCase()
  const dateFrom = normalizeString(query.dateFrom)
  const dateTo = normalizeString(query.dateTo)
  const page = parsePage(query.page)
  const pageSize = parsePageSize(query.pageSize) || 50

  const createdAt = buildCreatedAtFilter(dateFrom, dateTo)

  const where = {
    ...(createdAt ? { createdAt } : {}),
    ...(severity
      ? {
          severity: severity as 'INFO' | 'WARNING' | 'CRITICAL',
        }
      : {}),
    ...(search
      ? {
          OR: [
            { eventType: { contains: search } },
            { entityType: { contains: search } },
            { entityId: { contains: search } },
            { entityLabel: { contains: search } },
            { userEmail: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    items: items.map(item => ({
      id: item.id,
      severity: item.severity,
      eventType: item.eventType,
      entityType: item.entityType,
      entityId: item.entityId,
      entityLabel: item.entityLabel,
      action: item.action,
      userId: item.userId,
      userEmail: item.userEmail,
      createdAt: item.createdAt.toISOString(),
      metadata: item.metadata as Record<string, unknown> | null,
    })),
    total,
    page,
    pageSize,
  }
})

function buildCreatedAtFilter(dateFrom: string, dateTo: string) {
  const createdAt: {
    gte?: Date
    lte?: Date
  } = {}

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00.000Z`)

    if (!Number.isNaN(from.getTime())) {
      createdAt.gte = from
    }
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999Z`)

    if (!Number.isNaN(to.getTime())) {
      createdAt.lte = to
    }
  }

  return Object.keys(createdAt).length ? createdAt : null
}
