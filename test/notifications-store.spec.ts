import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationsStore } from '../stores/useNotificationsStore'

const { NotificationsModule } = vi.hoisted(() => ({
  NotificationsModule: {
    list: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('~/api/notifications', () => ({
  NotificationsModule,
}))

describe('useNotificationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches the list and updates items plus pagination state', async () => {
    NotificationsModule.list.mockResolvedValue({
      items: [
        {
          id: 'notification-1',
          title: 'Teste',
          isRead: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const store = useNotificationsStore()

    const response = await store.fetchList()

    expect(NotificationsModule.list).toHaveBeenCalledWith({
      severity: '',
      status: '',
      page: 1,
      pageSize: 50,
    })
    expect(store.data).toEqual([
      {
        id: 'notification-1',
        title: 'Teste',
        isRead: false,
      },
    ])
    expect(store.total).toBe(1)
    expect(response).toEqual({
      items: [
        {
          id: 'notification-1',
          title: 'Teste',
          isRead: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })
  })

  it('marks an item as read, patches local state and decrements unread count', async () => {
    const store = useNotificationsStore()

    store.data = [
      {
        id: 'notification-1',
        title: 'Teste',
        isRead: false,
      } as never,
    ]
    store.preview = [
      {
        id: 'notification-1',
        title: 'Teste',
        isRead: false,
      } as never,
    ]
    store.unreadCount = 2

    NotificationsModule.markAsRead.mockResolvedValue({
      id: 'notification-1',
      title: 'Teste',
      isRead: true,
    })

    const updated = await store.markAsRead('notification-1')

    expect(NotificationsModule.markAsRead).toHaveBeenCalledWith('notification-1')
    expect(store.data[0].isRead).toBe(true)
    expect(store.preview[0].isRead).toBe(true)
    expect(store.unreadCount).toBe(1)
    expect(updated).toEqual({
      id: 'notification-1',
      title: 'Teste',
      isRead: true,
    })
  })

  it('forces a fresh list fetch after marking as read inside the unread filter', async () => {
    const store = useNotificationsStore()

    store.filters = {
      severity: '',
      status: 'unread',
      page: 1,
      pageSize: 50,
    }
    store.data = [
      {
        id: 'notification-1',
        title: 'Teste',
        isRead: false,
      } as never,
    ]

    NotificationsModule.markAsRead.mockResolvedValue({
      id: 'notification-1',
      title: 'Teste',
      isRead: true,
    })
    NotificationsModule.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await store.markAsRead('notification-1')

    expect(NotificationsModule.list).toHaveBeenCalledWith({
      severity: '',
      status: 'unread',
      page: 1,
      pageSize: 50,
    })
    expect(store.data).toEqual([])
  })

  it('marks all notifications as read and refreshes both list and preview', async () => {
    const store = useNotificationsStore()

    store.unreadCount = 4

    NotificationsModule.markAllAsRead.mockResolvedValue({
      updatedCount: 4,
    })
    NotificationsModule.list
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'notification-2',
            title: 'Preview',
            isRead: true,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 5,
      })

    await store.markAllAsRead()

    expect(NotificationsModule.markAllAsRead).toHaveBeenCalledOnce()
    expect(store.unreadCount).toBe(0)
    expect(NotificationsModule.list).toHaveBeenNthCalledWith(1, {
      severity: '',
      status: '',
      page: 1,
      pageSize: 50,
    })
    expect(NotificationsModule.list).toHaveBeenNthCalledWith(2, {
      severity: '',
      status: '',
      page: 1,
      pageSize: 5,
    })
    expect(store.preview).toEqual([
      {
        id: 'notification-2',
        title: 'Preview',
        isRead: true,
      },
    ])
  })

  it('deletes a notification, updates unread count and rewinds page when the current one becomes empty', async () => {
    const store = useNotificationsStore()

    store.filters = {
      severity: '',
      status: '',
      page: 2,
      pageSize: 50,
    }
    store.data = [
      {
        id: 'notification-9',
        title: 'Excluir',
        isRead: false,
      } as never,
    ]
    store.total = 1
    store.unreadCount = 1

    NotificationsModule.remove.mockResolvedValue({
      success: true,
    })
    NotificationsModule.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await store.deleteItem('notification-9')

    expect(NotificationsModule.remove).toHaveBeenCalledWith('notification-9')
    expect(store.unreadCount).toBe(0)
    expect(store.filters.page).toBe(1)
    expect(NotificationsModule.list).toHaveBeenCalledWith({
      severity: '',
      status: '',
      page: 1,
      pageSize: 50,
    })
  })
})
