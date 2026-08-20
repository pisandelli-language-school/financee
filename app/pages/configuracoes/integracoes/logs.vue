<script setup lang="ts">
import { IntegrationsModule } from '~/api/integrations'
import type { AppTableColumn } from '~/types/backoffice'
import type { IntegrationClientRecord, IntegrationLogDetailRecord, IntegrationLogRecord } from '~/types/integrations'

const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const meta = getSectionMeta('integracoes')
const data = ref<IntegrationLogRecord[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const filters = reactive({ provider: '', status: '', direction: '', clientId: '', operation: '', entityType: '', dateFrom: '', dateTo: '' })
const detailOpen = ref(false)
const detail = ref<IntegrationLogDetailRecord | null>(null)
const detailLoading = ref(false)
const clients = ref<IntegrationClientRecord[]>([])
const columns: AppTableColumn[] = [
  { key: 'createdAt', title: 'Data' }, { key: 'operation', title: 'Operação' }, { key: 'clientName', title: 'Cliente' }, { key: 'direction', title: 'Direção' }, { key: 'status', title: 'Status' }, { key: 'actions', title: 'Ações', align: 'right', width: '64px' },
]
const statusOptions = [{ label: 'Todos os status', value: '' }, ...['SUCCESS', 'FAILED', 'PENDING', 'IGNORED'].map(value => ({ label: value, value }))]
const directionOptions = [{ label: 'Todas as direções', value: '' }, ...['EXPOSED_API', 'OUTBOUND', 'INBOUND'].map(value => ({ label: value, value }))]
const clientOptions = computed(() => [
  { label: 'Todos os clientes', value: '' },
  ...clients.value.map(client => ({ label: client.name, value: client.id })),
])
async function fetchLogs() { loading.value = true; error.value = ''; try { const response = await IntegrationsModule.listLogs({ ...filters, page: page.value, pageSize: 50 }); data.value = response.items; total.value = response.total } catch (caught) { error.value = getErrorMessage(caught, 'Não foi possível carregar os logs.') } finally { loading.value = false } }
watch(() => [filters.provider, filters.status, filters.direction, filters.clientId, filters.operation, filters.entityType, filters.dateFrom, filters.dateTo, page.value], () => void fetchLogs(), { immediate: true })
onMounted(async () => { clients.value = await IntegrationsModule.list() })
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
function statusColor(value: string) { return value === 'SUCCESS' ? 'success' : value === 'FAILED' ? 'danger' : value === 'PENDING' ? 'warning' : 'info' }
async function openDetail(row: IntegrationLogRecord) { detailOpen.value = true; detailLoading.value = true; detail.value = null; try { detail.value = await IntegrationsModule.getLog(row.id) } catch (caught) { error.value = getErrorMessage(caught, 'Não foi possível carregar o detalhe.') } finally { detailLoading.value = false } }
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(:breadcrumb="getBreadcrumb('integracoes')" title="Logs de integração" description="Investigue acessos e eventos da API externa.")
  backoffice-list-panel(:columns="columns" :data="data" :loading="loading" :is-invalid="Boolean(error)" :error-message="error" :page="page" :total="total" :page-size="50" @update:page="page = $event")
    template(#toolbar)
      dd-input(:model-value="filters.provider" placeholder="Provider" @update:model-value="filters.provider = String($event ?? ''); page = 1")
      dd-select(:model-value="filters.status" :options="statusOptions" @update:model-value="filters.status = String($event ?? ''); page = 1")
      dd-select(:model-value="filters.direction" :options="directionOptions" @update:model-value="filters.direction = String($event ?? ''); page = 1")
      dd-select(:model-value="filters.clientId" :options="clientOptions" @update:model-value="filters.clientId = String($event ?? ''); page = 1")
      dd-input(:model-value="filters.operation" placeholder="Operação" @update:model-value="filters.operation = String($event ?? ''); page = 1")
      dd-input(:model-value="filters.entityType" placeholder="Entidade" @update:model-value="filters.entityType = String($event ?? ''); page = 1")
      dd-input(:model-value="filters.dateFrom" type="date" aria-label="Data inicial" @update:model-value="filters.dateFrom = String($event ?? ''); page = 1")
      dd-input(:model-value="filters.dateTo" type="date" aria-label="Data final" @update:model-value="filters.dateTo = String($event ?? ''); page = 1")
    template(#cell-createdAt="{ row }") {{ formatDate(row.createdAt) }}
    template(#cell-clientName="{ row }") {{ row.clientName ?? 'Sistema' }}
    template(#cell-status="{ row }")
      dd-badge(:color="statusColor(row.status)") {{ row.status }}
    template(#cell-actions="{ row }")
      dd-button(ghost icon-only icon="lucide:eye" aria-label="Ver detalhe do log" @click="openDetail(row)")
  dd-drawer(:open="detailOpen" title="Detalhe do log" @update:open="detailOpen = $event")
    dd-loading(v-if="detailLoading") Carregando detalhes
    dd-stack(v-else-if="detail" compact)
      dd-alert(v-if="detail.errorMessage" danger :closable="false") {{ detail.errorMessage }}
      strong {{ detail.operation }}
      span {{ detail.clientName ?? 'Sistema' }} · {{ formatDate(detail.createdAt) }}
      dd-stack(compact)
        strong Request summary
        pre {{ JSON.stringify(detail.requestSummary, null, 2) }}
      dd-stack(compact)
        strong Response summary
        pre {{ JSON.stringify(detail.responseSummary, null, 2) }}
      dd-stack(v-if="detail.rawPayload" compact)
        strong Payload retido
        pre {{ JSON.stringify(detail.rawPayload, null, 2) }}
</template>
