import { defineStore } from 'pinia'
import { ref } from 'vue'
import { NotificationsModule } from '~/api/notifications'
import type { NotificationFilters, NotificationRecord } from '~/types/notifications'

interface SerializableError {
  message: string
  statusCode?: number
  statusMessage?: string
  data?: unknown
}

function toSerializableError(caughtError: unknown): SerializableError {
  if (caughtError instanceof Error) {
    const typedError = caughtError as Error & {
      statusCode?: number
      statusMessage?: string
      data?: unknown
    }

    return {
      message: typedError.message,
      statusCode: typedError.statusCode,
      statusMessage: typedError.statusMessage,
      data: typedError.data,
    }
  }

  if (caughtError && typeof caughtError === 'object') {
    const typedError = caughtError as {
      message?: unknown
      statusCode?: unknown
      statusMessage?: unknown
      data?: unknown
    }

    return {
      message: typeof typedError.message === 'string' ? typedError.message : 'Erro inesperado.',
      statusCode: typeof typedError.statusCode === 'number' ? typedError.statusCode : undefined,
      statusMessage: typeof typedError.statusMessage === 'string' ? typedError.statusMessage : undefined,
      data: typedError.data,
    }
  }

  return {
    message: 'Erro inesperado.',
  }
}

const defaultFilters: NotificationFilters = {
  severity: '',
  status: '',
  page: 1,
  pageSize: 50,
}

export const useNotificationsStore = defineStore('notifications', () => {
  const data = ref<NotificationRecord[]>([])
  const preview = ref<NotificationRecord[]>([])
  const filters = ref<NotificationFilters>({ ...defaultFilters })
  const total = ref(0)
  const unreadCount = ref(0)
  const loading = ref(false)
  const previewLoading = ref(false)
  const unreadCountLoading = ref(false)
  const actionLoading = ref(false)
  const error = ref<SerializableError | null>(null)
  const loadedAt = ref(0)
  const previewLoadedAt = ref(0)
  const unreadLoadedAt = ref(0)

  async function fetchList(options?: { force?: boolean }) {
    if (!options?.force && import.meta.client && Date.now() - loadedAt.value < 15_000) {
      return {
        items: data.value,
        total: total.value,
        page: filters.value.page,
        pageSize: filters.value.pageSize,
      }
    }

    loading.value = true
    error.value = null

    try {
      const response = await NotificationsModule.list(filters.value)
      data.value = response.items
      total.value = response.total
      loadedAt.value = Date.now()
      return response
    } catch (caughtError) {
      error.value = toSerializableError(caughtError)
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function fetchPreview(options?: { force?: boolean }) {
    if (!options?.force && import.meta.client && Date.now() - previewLoadedAt.value < 15_000) {
      return preview.value
    }

    previewLoading.value = true

    try {
      const response = await NotificationsModule.list({
        ...defaultFilters,
        page: 1,
        pageSize: 5,
      })

      preview.value = response.items
      previewLoadedAt.value = Date.now()
      return preview.value
    } finally {
      previewLoading.value = false
    }
  }

  async function fetchUnreadCount(options?: { force?: boolean }) {
    if (!options?.force && import.meta.client && Date.now() - unreadLoadedAt.value < 15_000) {
      return unreadCount.value
    }

    unreadCountLoading.value = true

    try {
      const response = await NotificationsModule.getUnreadCount()
      unreadCount.value = response.unreadCount
      unreadLoadedAt.value = Date.now()
      return unreadCount.value
    } finally {
      unreadCountLoading.value = false
    }
  }

  function patchNotification(nextRecord: NotificationRecord) {
    data.value = data.value.map(item => item.id === nextRecord.id ? nextRecord : item)
    preview.value = preview.value.map(item => item.id === nextRecord.id ? nextRecord : item)
  }

  function removeNotification(id: string) {
    data.value = data.value.filter(item => item.id !== id)
    preview.value = preview.value.filter(item => item.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  async function markAsRead(id: string) {
    actionLoading.value = true

    try {
      const updated = await NotificationsModule.markAsRead(id)
      patchNotification(updated)

      if (unreadCount.value > 0 && updated.isRead) {
        unreadCount.value -= 1
      }

      if (filters.value.status === 'unread') {
        await fetchList({ force: true })
      }

      return updated
    } finally {
      actionLoading.value = false
    }
  }

  async function markAllAsRead() {
    actionLoading.value = true

    try {
      await NotificationsModule.markAllAsRead()
      unreadCount.value = 0
      loadedAt.value = 0
      previewLoadedAt.value = 0
      await Promise.all([
        fetchList({ force: true }),
        fetchPreview({ force: true }),
      ])
    } finally {
      actionLoading.value = false
    }
  }

  async function deleteItem(id: string) {
    actionLoading.value = true

    try {
      const target = [...data.value, ...preview.value].find(item => item.id === id) ?? null
      await NotificationsModule.remove(id)
      removeNotification(id)

      if (target && !target.isRead && unreadCount.value > 0) {
        unreadCount.value -= 1
      }

      if (filters.value.page > 1 && data.value.length === 0) {
        filters.value = {
          ...filters.value,
          page: filters.value.page - 1,
        }
      }

      await fetchList({ force: true })
    } finally {
      actionLoading.value = false
    }
  }

  function setFilters(nextFilters: Partial<NotificationFilters>) {
    filters.value = {
      ...filters.value,
      ...nextFilters,
    }
    loadedAt.value = 0
  }

  function reset() {
    data.value = []
    preview.value = []
    filters.value = { ...defaultFilters }
    total.value = 0
    unreadCount.value = 0
    error.value = null
    loadedAt.value = 0
    previewLoadedAt.value = 0
    unreadLoadedAt.value = 0
  }

  return {
    data,
    preview,
    filters,
    total,
    unreadCount,
    loading,
    previewLoading,
    unreadCountLoading,
    actionLoading,
    error,
    fetchList,
    fetchPreview,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteItem,
    reset,
    setFilters,
  }
})
