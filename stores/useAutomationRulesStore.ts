import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AutomationRulesModule } from '~/api/notifications'
import type { AutomationRuleRecord, AutomationRuleUpdatePayload } from '~/types/notifications'

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

export const useAutomationRulesStore = defineStore('automation-rules', () => {
  const data = ref<AutomationRuleRecord[]>([])
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref<SerializableError | null>(null)
  const loadedAt = ref(0)

  async function fetch(options?: { force?: boolean }) {
    if (!options?.force && import.meta.client && Date.now() - loadedAt.value < 15_000) {
      return data.value
    }

    loading.value = true
    error.value = null

    try {
      data.value = await AutomationRulesModule.list()
      loadedAt.value = Date.now()
      return data.value
    } catch (caughtError) {
      error.value = toSerializableError(caughtError)
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  function patchRule(nextRule: AutomationRuleRecord) {
    data.value = data.value.map(item => item.id === nextRule.id ? nextRule : item)
    loadedAt.value = Date.now()
  }

  async function updateRule(id: string, payload: AutomationRuleUpdatePayload) {
    actionLoading.value = true

    try {
      const updated = await AutomationRulesModule.update(id, payload)
      patchRule(updated)
      return updated
    } finally {
      actionLoading.value = false
    }
  }

  async function toggleRule(id: string, isEnabled: boolean) {
    actionLoading.value = true

    try {
      const updated = await AutomationRulesModule.toggle(id, isEnabled)
      patchRule(updated)
      return updated
    } finally {
      actionLoading.value = false
    }
  }

  return {
    data,
    loading,
    actionLoading,
    error,
    fetch,
    updateRule,
    toggleRule,
  }
})
