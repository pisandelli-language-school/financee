import { Prisma } from '@prisma/client'
import type { Notification, AutomationRule, NotificationSeverity } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { normalizeString, parsePage, parsePageSize } from '~~/server/utils/auth-admin'

export interface NotificationsListFilters {
  severity: '' | NotificationSeverity
  status: string
  page: number
  pageSize: number
}

function serializeNotification(record: Notification) {
  return {
    id: record.id,
    title: record.title,
    message: record.message,
    type: record.type,
    severity: record.severity,
    isRead: record.isRead,
    readAt: record.readAt?.toISOString() ?? null,
    isPriority: record.isPriority,
    entityType: record.entityType,
    entityId: record.entityId,
    actionUrl: record.actionUrl,
    metadata: toRecord(record.metadata),
    createdAt: record.createdAt.toISOString(),
  }
}

function serializeAutomationRule(record: AutomationRule) {
  return {
    id: record.id,
    key: record.key,
    title: record.title,
    isEnabled: record.isEnabled,
    severity: record.severity,
    config: toRecord(record.config),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

export function parseNotificationsFilters(query: Record<string, unknown>): NotificationsListFilters {
  const severity = normalizeString(query.severity)
  const status = normalizeString(query.status)
  const page = parsePage(query.page)
  const parsedPageSize = parsePageSize(query.pageSize)
  const pageSize = parsedPageSize === 0 ? 0 : parsedPageSize || 50

  if (severity && !['INFO', 'WARNING', 'CRITICAL'].includes(severity)) {
    throw createError({
      statusCode: 400,
      message: 'Severidade inválida.',
    })
  }

  if (status && !['read', 'unread'].includes(status)) {
    throw createError({
      statusCode: 400,
      message: 'Filtro de leitura inválido.',
    })
  }

  return {
    severity: severity as '' | NotificationSeverity,
    status,
    page,
    pageSize,
  }
}

export async function listNotifications(userId: string, filters: NotificationsListFilters) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    deletedAt: null,
    archivedAt: null,
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.status === 'read'
      ? { isRead: true }
      : {}),
    ...(filters.status === 'unread'
      ? { isRead: false }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [
        { isRead: 'asc' },
        { isPriority: 'desc' },
        { createdAt: 'desc' },
      ],
      ...(filters.pageSize > 0
        ? {
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
          }
        : {}),
    }),
    prisma.notification.count({ where }),
  ])

  return {
    items: items.map(serializeNotification),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  }
}

export async function countUnreadNotifications(userId: string) {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
      deletedAt: null,
      archivedAt: null,
    },
  })
}

export async function archiveExpiredNotifications() {
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - 30)

  const result = await prisma.notification.updateMany({
    where: {
      isRead: true,
      readAt: {
        lte: threshold,
      },
      archivedAt: null,
      deletedAt: null,
    },
    data: {
      archivedAt: new Date(),
    },
  })

  return result.count
}

export async function markNotificationAsRead(userId: string, id: string) {
  const record = await prisma.notification.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
      archivedAt: null,
    },
  })

  if (!record) {
    throw createError({
      statusCode: 404,
      message: 'Notificação não encontrada.',
    })
  }

  const updated = record.isRead
    ? record
    : await prisma.notification.update({
        where: { id: record.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

  return serializeNotification(updated)
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
      deletedAt: null,
      archivedAt: null,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return result.count
}

export async function deleteNotification(userId: string, id: string) {
  const record = await prisma.notification.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
      archivedAt: null,
    },
    select: { id: true },
  })

  if (!record) {
    throw createError({
      statusCode: 404,
      message: 'Notificação não encontrada.',
    })
  }

  await prisma.notification.update({
    where: { id: record.id },
    data: {
      deletedAt: new Date(),
    },
  })
}

export async function listAutomationRules() {
  const items = await prisma.automationRule.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return items.map(serializeAutomationRule)
}

export async function updateAutomationRule(
  id: string,
  payload: {
    severity: 'INFO' | 'WARNING' | 'CRITICAL'
    config: Record<string, unknown> | null
  },
) {
  const config = payload.config == null
    ? Prisma.JsonNull
    : payload.config as Prisma.InputJsonValue

  const updated = await prisma.automationRule.update({
    where: { id },
    data: {
      severity: payload.severity,
      config,
    },
  })

  return serializeAutomationRule(updated)
}

export async function toggleAutomationRule(id: string, isEnabled: boolean) {
  const updated = await prisma.automationRule.update({
    where: { id },
    data: { isEnabled },
  })

  return serializeAutomationRule(updated)
}
