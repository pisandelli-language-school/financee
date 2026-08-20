import type { IntegrationClientFormValues, IntegrationClientRecord, IntegrationLogDetailRecord, IntegrationLogRecord } from '~/types/integrations'
import type { PaginatedResponse } from '~/types/backoffice'

function requestOptions() {
  return import.meta.server ? { headers: useRequestHeaders(['cookie']) } : {}
}

export const IntegrationsModule = {
  async list() {
    return await $fetch<IntegrationClientRecord[]>('/api/integrations/clients', { ...requestOptions() })
  },
  async create(values: IntegrationClientFormValues) {
    return await $fetch<IntegrationClientRecord>('/api/integrations/clients', { method: 'POST', body: values, ...requestOptions() })
  },
  async update(id: string, values: IntegrationClientFormValues) {
    return await $fetch<IntegrationClientRecord>(`/api/integrations/clients/${id}`, { method: 'PUT', body: values, ...requestOptions() })
  },
  async issueToken(id: string) {
    return await $fetch<{ token: string, expiresAt: string }>(`/api/integrations/clients/${id}/token`, { method: 'POST', ...requestOptions() })
  },
  async listLogs(query: object) {
    return await $fetch<PaginatedResponse<IntegrationLogRecord>>('/api/integrations/logs', { query, ...requestOptions() })
  },
  async getLog(id: string) {
    return await $fetch<IntegrationLogDetailRecord>(`/api/integrations/logs/${id}`, { ...requestOptions() })
  },
}
