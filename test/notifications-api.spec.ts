import { beforeEach, describe, expect, it, vi } from 'vitest'

const requirePermission = vi.fn()
const archiveExpiredNotifications = vi.fn()
const countUnreadNotifications = vi.fn()
const listNotifications = vi.fn()
const markAllNotificationsAsRead = vi.fn()
const markNotificationAsRead = vi.fn()
const deleteNotification = vi.fn()
const syncNotificationAutomations = vi.fn()

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {},
}))

vi.mock('~~/server/utils/auth', () => ({
  requirePermission,
}))

vi.mock('~~/server/utils/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~~/server/utils/notifications')>()

  return {
    ...actual,
    archiveExpiredNotifications,
    countUnreadNotifications,
    listNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    deleteNotification,
  }
})

vi.mock('~~/server/utils/notifications-automation', () => ({
  syncNotificationAutomations,
}))

vi.stubGlobal('createError', (input: { message?: string, statusCode?: number, data?: unknown }) => {
  const error = new Error(input.message ?? 'Erro')

  Object.assign(error, {
    statusCode: input.statusCode,
    data: input.data,
  })

  return error
})

vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler)
vi.stubGlobal('getQuery', vi.fn())
vi.stubGlobal('getRouterParam', vi.fn())

describe('notifications api handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requirePermission.mockResolvedValue({
      user: {
        id: 'user-1',
      },
    })
  })

  it('lists notifications and runs archive/sync side effects before returning items', async () => {
    vi.mocked(getQuery).mockReturnValue({
      severity: 'WARNING',
      status: 'unread',
      page: '2',
    })

    listNotifications.mockResolvedValue({
      items: [{ id: 'notification-1' }],
      total: 1,
      page: 2,
      pageSize: 50,
    })

    const handler = (await import('~~/server/api/notifications.get')).default
    const response = await handler({})

    expect(archiveExpiredNotifications).toHaveBeenCalledOnce()
    expect(syncNotificationAutomations).toHaveBeenCalledOnce()
    expect(listNotifications).toHaveBeenCalledWith('user-1', {
      severity: 'WARNING',
      status: 'unread',
      page: 2,
      pageSize: 50,
    })
    expect(response).toEqual({
      items: [{ id: 'notification-1' }],
      total: 1,
      page: 2,
      pageSize: 50,
    })
  })

  it('returns unread count after archive/sync maintenance', async () => {
    countUnreadNotifications.mockResolvedValue(3)

    const handler = (await import('~~/server/api/notifications/unread-count.get')).default
    const response = await handler({})

    expect(archiveExpiredNotifications).toHaveBeenCalledOnce()
    expect(syncNotificationAutomations).toHaveBeenCalledOnce()
    expect(countUnreadNotifications).toHaveBeenCalledWith('user-1')
    expect(response).toEqual({
      unreadCount: 3,
    })
  })

  it('marks all notifications as read for the current user', async () => {
    markAllNotificationsAsRead.mockResolvedValue(4)

    const handler = (await import('~~/server/api/notifications/read-all.patch')).default
    const response = await handler({})

    expect(markAllNotificationsAsRead).toHaveBeenCalledWith('user-1')
    expect(response).toEqual({
      updatedCount: 4,
    })
  })

  it('rejects individual read when the notification id is missing', async () => {
    vi.mocked(getRouterParam).mockReturnValue(undefined)

    const handler = (await import('~~/server/api/notifications/[id]/read.patch')).default

    await expect(handler({})).rejects.toMatchObject({
      message: 'ID da notificação é obrigatório.',
      statusCode: 400,
    })
  })

  it('marks an individual notification as read', async () => {
    vi.mocked(getRouterParam).mockReturnValue('notification-42')
    markNotificationAsRead.mockResolvedValue({
      id: 'notification-42',
      isRead: true,
    })

    const handler = (await import('~~/server/api/notifications/[id]/read.patch')).default
    const response = await handler({})

    expect(markNotificationAsRead).toHaveBeenCalledWith('user-1', 'notification-42')
    expect(response).toEqual({
      id: 'notification-42',
      isRead: true,
    })
  })

  it('deletes an individual notification and returns a success flag', async () => {
    vi.mocked(getRouterParam).mockReturnValue('notification-77')

    const handler = (await import('~~/server/api/notifications/[id].delete')).default
    const response = await handler({})

    expect(deleteNotification).toHaveBeenCalledWith('user-1', 'notification-77')
    expect(response).toEqual({
      success: true,
    })
  })
})
