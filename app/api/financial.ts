import type {
  FinancialEntryCreatePayload,
  FinancialEntryFilters,
  FinancialEntryListResponse,
  FinancialEntryPaymentPayload,
  FinancialEntryRecord,
  FinancialEntryUpdatePayload,
} from '~/types/financial'

interface FinancialRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: object
  body?: unknown
  headers?: Record<string, string | undefined>
}

function useFinancialRequestOptions() {
  if (!import.meta.server) {
    return {}
  }

  const headers = useRequestHeaders(['cookie'])

  return {
    headers,
  }
}

async function fetchFinancial<T>(endpoint: string, options: FinancialRequestOptions) {
  const request = $fetch as unknown as (url: string, options: FinancialRequestOptions) => Promise<T>

  return await request(endpoint, options)
}

export const FinancialEntriesModule = {
  async list(filters: FinancialEntryFilters) {
    const requestOptions = useFinancialRequestOptions()

    return await fetchFinancial<FinancialEntryListResponse>('/api/lancamentos', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async get(id: string) {
    const requestOptions = useFinancialRequestOptions()

    return await fetchFinancial<FinancialEntryRecord>(`/api/lancamentos/${id}`, {
      method: 'GET',
      ...requestOptions,
    })
  },
  async create(payload: FinancialEntryCreatePayload) {
    const requestOptions = useFinancialRequestOptions()

    return await fetchFinancial<FinancialEntryRecord>('/api/lancamentos', {
      method: 'POST',
      body: payload,
      ...requestOptions,
    })
  },
  async update(id: string, payload: FinancialEntryUpdatePayload) {
    const requestOptions = useFinancialRequestOptions()

    return await fetchFinancial<FinancialEntryRecord>(`/api/lancamentos/${id}`, {
      method: 'PUT',
      body: payload,
      ...requestOptions,
    })
  },
  async markAsPaid(id: string, payload: FinancialEntryPaymentPayload) {
    const requestOptions = useFinancialRequestOptions()

    return await fetchFinancial<FinancialEntryRecord>(`/api/lancamentos/${id}/pay`, {
      method: 'POST',
      body: payload,
      ...requestOptions,
    })
  },
  async markAsOpen(id: string) {
    const requestOptions = useFinancialRequestOptions()

    return await fetchFinancial<FinancialEntryRecord>(`/api/lancamentos/${id}/open`, {
      method: 'POST',
      ...requestOptions,
    })
  },
  async cancel(id: string) {
    const requestOptions = useFinancialRequestOptions()

    return await fetchFinancial<FinancialEntryRecord>(`/api/lancamentos/${id}/cancel`, {
      method: 'POST',
      ...requestOptions,
    })
  },
  async delete(id: string) {
    const requestOptions = useFinancialRequestOptions()

    await fetchFinancial<unknown>(`/api/lancamentos/${id}`, {
      method: 'DELETE',
      ...requestOptions,
    })
  },
}
