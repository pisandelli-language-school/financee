import type {
  ContractFilters,
  ContractFormValues,
  ContractGenerationFormValues,
  ContractGenerationResponse,
  ContractHistoryResponse,
  ContractListResponse,
  ContractRecord,
} from '~/types/contracts'

interface ContractsRequestOptions {
  method: 'GET' | 'POST' | 'PUT'
  query?: object
  body?: unknown
  headers?: Record<string, string | undefined>
}

function useContractsRequestOptions() {
  if (!import.meta.server) {
    return {}
  }

  const headers = useRequestHeaders(['cookie'])

  return { headers }
}

async function fetchContracts<T>(endpoint: string, options: ContractsRequestOptions) {
  const request = $fetch as unknown as (url: string, options: ContractsRequestOptions) => Promise<T>
  return await request(endpoint, options)
}

export const ContractsModule = {
  async list(filters: ContractFilters) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractListResponse>('/api/contratos', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async get(id: string) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractRecord>(`/api/contratos/${id}`, {
      method: 'GET',
      ...requestOptions,
    })
  },
  async create(payload: ContractFormValues) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractRecord>('/api/contratos', {
      method: 'POST',
      body: payload,
      ...requestOptions,
    })
  },
  async update(id: string, payload: ContractFormValues) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractRecord>(`/api/contratos/${id}`, {
      method: 'PUT',
      body: payload,
      ...requestOptions,
    })
  },
  async changeStatus(id: string, status: string) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractRecord>(`/api/contratos/${id}/status`, {
      method: 'POST',
      body: { status },
      ...requestOptions,
    })
  },
  async renew(id: string, payload: ContractFormValues) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractRecord>(`/api/contratos/${id}/renew`, {
      method: 'POST',
      body: payload,
      ...requestOptions,
    })
  },
  async getHistory(id: string) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractHistoryResponse>(`/api/contratos/${id}/history`, {
      method: 'GET',
      ...requestOptions,
    })
  },
  async generate(id: string, payload: ContractGenerationFormValues) {
    const requestOptions = useContractsRequestOptions()

    return await fetchContracts<ContractGenerationResponse>(`/api/contratos/${id}/generate`, {
      method: 'POST',
      body: payload,
      ...requestOptions,
    })
  },
}
