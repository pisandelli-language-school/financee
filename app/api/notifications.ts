import type {
  AutomationRuleRecord,
  AutomationRuleUpdatePayload,
  NotificationFilters,
  NotificationRecord,
} from '~/types/notifications'
import type { PaginatedResponse } from '~/types/backoffice'

interface NotificationsRequestOptions {
  method: 'GET' | 'PATCH' | 'DELETE'
  query?: object
  body?: object
  headers?: Record<string, string | undefined>
}

function useNotificationsRequestOptions() {
  if (!import.meta.server) {
    return {}
  }

  const headers = useRequestHeaders(['cookie'])

  return {
    headers,
  }
}

async function fetchNotifications<T>(endpoint: string, options: NotificationsRequestOptions) {
  const request = $fetch as unknown as (url: string, options: NotificationsRequestOptions) => Promise<T>
  return await request(endpoint, options)
}

export const NotificationsModule = {
  async list(filters: NotificationFilters) {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<PaginatedResponse<NotificationRecord>>('/api/notifications', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async getUnreadCount() {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<{ unreadCount: number }>('/api/notifications/unread-count', {
      method: 'GET',
      ...requestOptions,
    })
  },
  async markAsRead(id: string) {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<NotificationRecord>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      ...requestOptions,
    })
  },
  async markAllAsRead() {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<{ updatedCount: number }>('/api/notifications/read-all', {
      method: 'PATCH',
      ...requestOptions,
    })
  },
  async remove(id: string) {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<{ success: true }>(`/api/notifications/${id}`, {
      method: 'DELETE',
      ...requestOptions,
    })
  },
}

export const AutomationRulesModule = {
  async list() {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<AutomationRuleRecord[]>('/api/automations', {
      method: 'GET',
      ...requestOptions,
    })
  },
  async update(id: string, payload: AutomationRuleUpdatePayload) {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<AutomationRuleRecord>(`/api/automations/${id}`, {
      method: 'PATCH',
      body: payload,
      ...requestOptions,
    })
  },
  async toggle(id: string, isEnabled: boolean) {
    const requestOptions = useNotificationsRequestOptions()

    return await fetchNotifications<AutomationRuleRecord>(`/api/automations/${id}/toggle`, {
      method: 'PATCH',
      body: { isEnabled },
      ...requestOptions,
    })
  },
}
