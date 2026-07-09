import { defineStore } from 'pinia'
import { ref } from 'vue'

interface PaginatedResult<TRecord> {
  items: TRecord[]
  total: number
  page: number
  pageSize: number
}

interface CrudModule<TRecord, TPayload, TFilters> {
  list: (filters: TFilters) => Promise<PaginatedResult<TRecord>>
  get?: (id: string) => Promise<TRecord>
  create: (payload: TPayload) => Promise<TRecord>
  update: (id: string, payload: TPayload) => Promise<TRecord>
  delete: (id: string) => Promise<void>
}

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

export function createCrudStore<TRecord extends { id: string }, TPayload, TFilters extends { page: number; pageSize: number }>(
  id: string,
  module: CrudModule<TRecord, TPayload, TFilters>,
  initialFilters: () => TFilters,
) {
  return defineStore(id, () => {
    const data = ref<TRecord[]>([])
    const loading = ref(false)
    const error = ref<SerializableError | null>(null)
    const filters = ref<TFilters>(initialFilters())
    const total = ref(0)

    async function fetch() {
      loading.value = true
      error.value = null

      try {
        const response = await module.list(filters.value)
        data.value = response.items
        total.value = response.total
        filters.value = {
          ...filters.value,
          page: response.page,
          pageSize: response.pageSize,
        }
        return response
      } catch (caughtError) {
        error.value = toSerializableError(caughtError)
        throw caughtError
      } finally {
        loading.value = false
      }
    }

    async function createItem(payload: TPayload) {
      const record = await module.create(payload)
      await fetch()
      return record
    }

    async function updateItem(idValue: string, payload: TPayload) {
      const record = await module.update(idValue, payload)
      await fetch()
      return record
    }

    async function removeItem(idValue: string) {
      await module.delete(idValue)
      const shouldGoBack = data.value.length === 1 && filters.value.page > 1

      if (shouldGoBack) {
        filters.value = {
          ...filters.value,
          page: filters.value.page - 1,
        }
      }

      await fetch()
    }

    function setFilters(nextFilters: Partial<TFilters>) {
      filters.value = {
        ...filters.value,
        ...nextFilters,
      }
    }

    function resetFilters() {
      filters.value = initialFilters()
    }

    return {
      data,
      loading,
      error,
      filters,
      total,
      fetch,
      createItem,
      updateItem,
      removeItem,
      resetFilters,
      setFilters,
    }
  })
}
