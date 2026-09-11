<script setup lang="ts">
import type { AppTableColumn } from '~/types/backoffice'
import { integrationScopeOptions, type IntegrationClientFormValues, type IntegrationClientRecord } from '~/types/integrations'
import { useIntegrationClientsStore } from '~~/stores/useIntegrationClientsStore'

const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const store = useIntegrationClientsStore()
const { showToast } = useToaster()
const fin = useCssModule('fin')
const meta = getSectionMeta('integracoes')
const search = ref('')
const modalOpen = ref(false)
const tokenOpen = ref(false)
const token = ref('')
const editing = ref<IntegrationClientRecord | null>(null)
const form = ref<IntegrationClientFormValues>({ name: '', clientId: '', scopes: ['contacts.read'], isActive: true })
const columns: AppTableColumn[] = [
  { key: 'name', title: 'Cliente' }, { key: 'scopes', title: 'Escopos' }, { key: 'credential', title: 'Token' }, { key: 'status', title: 'Status' }, { key: 'actions', title: 'Ações', align: 'right', width: '7rem' },
]
const filteredData = computed(() => store.data.filter(item => `${item.name} ${item.clientId}`.toLowerCase().includes(search.value.toLowerCase())))
await useAsyncData('integration-clients', async () => {
  await store.fetch()
  return null
})
function openCreate() { editing.value = null; form.value = { name: '', clientId: '', scopes: ['contacts.read'], isActive: true }; modalOpen.value = true }
function openEdit(client: IntegrationClientRecord) { editing.value = client; form.value = { name: client.name, clientId: client.clientId, scopes: [...client.scopes], isActive: client.isActive }; modalOpen.value = true }
function toggleScope(scope: string, checked: boolean) { form.value.scopes = checked ? [...new Set([...form.value.scopes, scope])] : form.value.scopes.filter(item => item !== scope) }
async function save() { try { await store.save(form.value, editing.value?.id); modalOpen.value = false; showToast('Cliente de integração salvo.', { title: 'Integrações', type: 'success' }) } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível salvar.', { title: 'Integrações', type: 'error' }) } }
async function issueToken(client: IntegrationClientRecord) { try { token.value = (await store.issueToken(client.id)).token; tokenOpen.value = true } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível emitir o token.', { title: 'Integrações', type: 'error' }) } }
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(:breadcrumb="getBreadcrumb('integracoes')" :title="meta.title" :description="meta.description")
  backoffice-list-panel(:columns="columns" :data="filteredData" :loading="store.loading" :is-invalid="Boolean(store.error)" :error-message="store.error?.message ?? ''" :page="1" :total="filteredData.length" :page-size="50")
    template(#toolbar)
      dd-input-search(small no-button :model-value="search" placeholder="Buscar cliente..." @update:model-value="search = String($event)")
      dd-button(small outline icon="lucide:scroll-text" to="/configuracoes/integracoes/logs") Ver logs
      dd-button(small primary icon="lucide:plus" @click="openCreate") Novo cliente
    template(#cell-name="{ row }")
      dd-stack(compact nogap)
        strong {{ row.name }}
        span {{ row.clientId }}
    template(#cell-scopes="{ row }") {{ row.scopes.join(', ') }}
    template(#cell-credential="{ row }") {{ row.activeCredential ? `Expira em ${new Date(row.activeCredential.expiresAt).toLocaleDateString('pt-BR')}` : 'Sem token ativo' }}
    template(#cell-status="{ row }")
      dd-badge(:success="row.isActive" :warning="!row.isActive") {{ row.isActive ? 'Ativo' : 'Inativo' }}
    template(#header-actions)
      span(:class="fin.actionsHeader") Ações
    template(#cell-actions="{ row }")
      dd-cluster(end :class="fin.actions")
        dd-popover(trigger="hover" placement="top")
          dd-button(ghost icon-only icon="lucide:key-round" aria-label="Emitir token" @click="issueToken(row)")
          template(#content) Emitir novo token
        dd-popover(trigger="hover" placement="top")
          dd-button(ghost icon-only icon="lucide:pencil" aria-label="Editar cliente" @click="openEdit(row)")
          template(#content) Editar cliente
  backoffice-modal-form-shell(:open="modalOpen" :title="editing ? 'Editar cliente' : 'Novo cliente'" @update:open="modalOpen = $event" @submit="save")
    dd-stack(compact)
      dd-input(v-model="form.name" label="Nome" required)
      dd-input(v-model="form.clientId" label="Client ID" required :disabled="Boolean(editing)")
      dd-checkbox(v-for="scope in integrationScopeOptions" :key="scope.value" :model-value="form.scopes.includes(scope.value)" @update:model-value="toggleScope(scope.value, Boolean($event))") {{ scope.label }}
      dd-toggle(:model-value="form.isActive" small @update:model-value="form.isActive = Boolean($event)") Cliente ativo
  dd-modal(:open="tokenOpen" title="Token emitido" @update:open="tokenOpen = $event")
    dd-alert(warning icon :closable="false") Copie este token agora. Ele não será exibido novamente.
    code {{ token }}
</template>

<style module="fin">
.actions {
  flex-wrap: nowrap;
  gap: v('space.xs');
}

.actionsHeader {
  display: flex;
  inline-size: 100%;
  justify-content: center;
}
</style>
