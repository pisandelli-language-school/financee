import { defineStore } from 'pinia'
import { IntegrationsModule } from '~/api/integrations'
import type { IntegrationClientFormValues, IntegrationClientRecord } from '~/types/integrations'

export const useIntegrationClientsStore = defineStore('integration-clients', () => {
  const data = ref<IntegrationClientRecord[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try { data.value = await IntegrationsModule.list() } catch (caught) { error.value = caught instanceof Error ? caught : new Error('Erro inesperado.') } finally { loading.value = false }
  }
  async function save(values: IntegrationClientFormValues, id?: string) {
    const client = id ? await IntegrationsModule.update(id, values) : await IntegrationsModule.create(values)
    const index = data.value.findIndex(item => item.id === client.id)
    if (index === -1) data.value.push(client)
    else data.value.splice(index, 1, client)
    return client
  }
  return { data, loading, error, fetch, save, issueToken: IntegrationsModule.issueToken }
})
