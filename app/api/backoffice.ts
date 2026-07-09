import type {
  AccountRecord,
  CategoryFilters,
  CategoryFormValues,
  CategoryRecord,
  ContactFilters,
  ContactFormValues,
  ContactRecord,
  CostCenterRecord,
  NonBusinessDayFilters,
  NonBusinessDayFormValues,
  NonBusinessDayRecord,
  PaginatedResponse,
  PaymentMethodRecord,
  SimpleCatalogFormValues,
  TagFormValues,
  TagRecord,
} from '~/types/backoffice'

type CrudModule<TRecord, TPayload, TFilters extends object> = {
  list: (filters: TFilters) => Promise<PaginatedResponse<TRecord>>
  get?: (id: string) => Promise<TRecord>
  create: (payload: TPayload) => Promise<TRecord>
  update: (id: string, payload: TPayload) => Promise<TRecord>
  delete: (id: string) => Promise<void>
}

interface BackofficeRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: object
  body?: Record<string, unknown>
  headers?: Record<string, string | undefined>
}

function useBackofficeRequestOptions() {
  if (!import.meta.server) {
    return {}
  }

  const headers = useRequestHeaders(['cookie'])

  return {
    headers,
  }
}

async function fetchBackoffice<T>(endpoint: string, options: BackofficeRequestOptions) {
  const request = $fetch as unknown as (url: string, options: BackofficeRequestOptions) => Promise<T>

  return await request(endpoint, options)
}

function createCrudModule<TRecord, TPayload, TFilters extends object>(
  section: string,
): CrudModule<TRecord, TPayload, TFilters> {
  return {
    async list(filters) {
      const endpoint = `/api/backoffice/${section}` as string
      const requestOptions = useBackofficeRequestOptions()

      return await fetchBackoffice<PaginatedResponse<TRecord>>(endpoint, {
        method: 'GET',
        query: filters,
        ...requestOptions,
      })
    },
    async get(id) {
      const endpoint = `/api/backoffice/${section}/${id}` as string
      const requestOptions = useBackofficeRequestOptions()

      return await fetchBackoffice<TRecord>(endpoint, {
        method: 'GET',
        ...requestOptions,
      })
    },
    async create(payload) {
      const endpoint = `/api/backoffice/${section}` as string
      const requestOptions = useBackofficeRequestOptions()

      return await fetchBackoffice<TRecord>(endpoint, {
        method: 'POST',
        body: payload as Record<string, unknown>,
        ...requestOptions,
      })
    },
    async update(id, payload) {
      const endpoint = `/api/backoffice/${section}/${id}` as string
      const requestOptions = useBackofficeRequestOptions()

      return await fetchBackoffice<TRecord>(endpoint, {
        method: 'PUT',
        body: payload as Record<string, unknown>,
        ...requestOptions,
      })
    },
    async delete(id) {
      const endpoint = `/api/backoffice/${section}/${id}` as string
      const requestOptions = useBackofficeRequestOptions()

      await fetchBackoffice(endpoint, {
        method: 'DELETE',
        ...requestOptions,
      })
    },
  }
}

export const CategoryModule = createCrudModule<CategoryRecord, CategoryFormValues, CategoryFilters>('categorias')
export const AccountModule = createCrudModule<AccountRecord, SimpleCatalogFormValues, { search: string; page: number; pageSize: number }>('contas-carteiras')
export const CostCenterModule = createCrudModule<CostCenterRecord, SimpleCatalogFormValues, { search: string; page: number; pageSize: number }>('centros-custo')
export const TagModule = createCrudModule<TagRecord, TagFormValues, { search: string; page: number; pageSize: number }>('tags')
export const ContactModule = createCrudModule<ContactRecord, ContactFormValues, ContactFilters>('contatos')
export const PaymentMethodModule = createCrudModule<PaymentMethodRecord, SimpleCatalogFormValues, { search: string; page: number; pageSize: number }>('formas-pagamento')
export const NonBusinessDayModule = createCrudModule<NonBusinessDayRecord, NonBusinessDayFormValues, NonBusinessDayFilters>('dias-nao-uteis')
