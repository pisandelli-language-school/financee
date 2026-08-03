import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { JobsModule } from '~/api/jobs'
import type { JobsFilters, JobDefinitionRecord, JobExecutionRecord } from '~/types/jobs'

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

function createInitialFilters(): JobsFilters {
  return {
    search: '',
    mode: '',
    status: '',
  }
}

export const useJobsStore = defineStore('jobs', () => {
  const data = ref<JobDefinitionRecord[]>([])
  const loading = ref(false)
  const actionLoading = ref(false)
  const historyLoading = ref(false)
  const error = ref<SerializableError | null>(null)
  const historyError = ref('')
  const filters = ref<JobsFilters>(createInitialFilters())
  const historyJobKey = ref('')
  const historyItems = ref<JobExecutionRecord[]>([])
  const loadedAt = ref(0)

  const filteredData = computed(() => {
    const search = filters.value.search.trim().toLowerCase()

    return data.value.filter((item) => {
      const matchesSearch = !search
        || item.title.toLowerCase().includes(search)
        || item.key.toLowerCase().includes(search)

      const matchesMode = !filters.value.mode || item.mode === filters.value.mode
      const matchesStatus = !filters.value.status || item.lastExecution?.status === filters.value.status

      return matchesSearch && matchesMode && matchesStatus
    })
  })

  async function fetch(options?: { force?: boolean }) {
    if (!options?.force && import.meta.client && Date.now() - loadedAt.value < 15_000) {
      return filteredData.value
    }

    loading.value = true
    error.value = null

    try {
      data.value = await JobsModule.list()
      loadedAt.value = Date.now()
      return filteredData.value
    } catch (caughtError) {
      error.value = toSerializableError(caughtError)
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  function patchJob(nextJob: JobDefinitionRecord) {
    data.value = data.value.map((item) => {
      if (item.key !== nextJob.key) {
        return item
      }

      return {
        ...nextJob,
        lastExecution: nextJob.lastExecution ?? item.lastExecution,
      }
    })
    loadedAt.value = Date.now()
  }

  function setFilters(nextFilters: Partial<JobsFilters>) {
    filters.value = {
      ...filters.value,
      ...nextFilters,
    }
  }

  async function toggleJob(jobKey: string, isEnabled: boolean) {
    actionLoading.value = true

    try {
      const updated = await JobsModule.toggle(jobKey, isEnabled)
      patchJob(updated)
      return updated
    } finally {
      actionLoading.value = false
    }
  }

  async function runJob(jobKey: string) {
    actionLoading.value = true

    try {
      const execution = await JobsModule.run(jobKey)
      await fetch({ force: true })

      if (historyJobKey.value === jobKey) {
        await loadHistory(jobKey)
      }

      return execution
    } finally {
      actionLoading.value = false
    }
  }

  async function loadHistory(jobKey: string) {
    historyLoading.value = true
    historyError.value = ''
    historyJobKey.value = jobKey

    try {
      historyItems.value = await JobsModule.getExecutions(jobKey)
      return historyItems.value
    } catch (caughtError) {
      historyError.value = toSerializableError(caughtError).message
      throw caughtError
    } finally {
      historyLoading.value = false
    }
  }

  function resetHistory() {
    historyJobKey.value = ''
    historyItems.value = []
    historyError.value = ''
  }

  return {
    data,
    loading,
    actionLoading,
    historyLoading,
    error,
    historyError,
    filters,
    historyJobKey,
    historyItems,
    filteredData,
    fetch,
    loadHistory,
    resetHistory,
    runJob,
    setFilters,
    toggleJob,
  }
})
