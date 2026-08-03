import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  notification: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('~~/server/utils/prisma', () => ({
  prisma,
}))

vi.stubGlobal('createError', (input: { message?: string, statusCode?: number, data?: unknown }) => {
  const error = new Error(input.message ?? 'Erro')

  Object.assign(error, {
    statusCode: input.statusCode,
    data: input.data,
  })

  return error
})

const {
  archiveExpiredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = await import('~~/server/utils/notifications')

describe('notifications retention rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('archives only read notifications older than 30 days', async () => {
    prisma.notification.updateMany.mockResolvedValue({
      count: 3,
    })

    const archivedCount = await archiveExpiredNotifications()

    expect(archivedCount).toBe(3)
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        isRead: true,
        readAt: {
          lte: new Date('2026-07-04T12:00:00.000Z'),
        },
        archivedAt: null,
        deletedAt: null,
      },
      data: {
        archivedAt: new Date('2026-08-03T12:00:00.000Z'),
      },
    })
  })

  it('marks a single notification as read without archiving it', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      title: 'Lançamento vencido',
      message: 'Mensagem',
      type: 'financial-entry-overdue',
      severity: 'CRITICAL',
      isRead: false,
      readAt: null,
      isPriority: true,
      entityType: 'FinancialEntry',
      entityId: 'entry-1',
      actionUrl: '/lancamentos',
      metadata: {
        description: 'Mensalidade',
      },
      createdAt: new Date('2026-08-02T10:00:00.000Z'),
      deletedAt: null,
      archivedAt: null,
    })
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      title: 'Lançamento vencido',
      message: 'Mensagem',
      type: 'financial-entry-overdue',
      severity: 'CRITICAL',
      isRead: true,
      readAt: new Date('2026-08-03T12:00:00.000Z'),
      isPriority: true,
      entityType: 'FinancialEntry',
      entityId: 'entry-1',
      actionUrl: '/lancamentos',
      metadata: {
        description: 'Mensalidade',
      },
      createdAt: new Date('2026-08-02T10:00:00.000Z'),
      deletedAt: null,
      archivedAt: null,
    })

    const notification = await markNotificationAsRead('user-1', 'notification-1')

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
        userId: 'user-1',
        deletedAt: null,
        archivedAt: null,
      },
    })
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
      },
      data: {
        isRead: true,
        readAt: new Date('2026-08-03T12:00:00.000Z'),
      },
    })
    expect(notification).toMatchObject({
      id: 'notification-1',
      isRead: true,
      readAt: '2026-08-03T12:00:00.000Z',
    })
  })

  it('marks all unread notifications as read while preserving them in the central', async () => {
    prisma.notification.updateMany.mockResolvedValue({
      count: 5,
    })

    const updatedCount = await markAllNotificationsAsRead('user-9')

    expect(updatedCount).toBe(5)
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-9',
        isRead: false,
        deletedAt: null,
        archivedAt: null,
      },
      data: {
        isRead: true,
        readAt: new Date('2026-08-03T12:00:00.000Z'),
      },
    })
  })
})
