<script setup lang="ts">
import { ContractsModule } from '~/api/contracts'
import type { AppTableColumn } from '~/types/backoffice'
import {
  type ContractGenerationFormValues,
  contractStatusOptions,
  type ContractFormValues,
  type ContractHistoryRecord,
  type ContractRecord,
  type ContractStatus,
} from '~/types/contracts'
import { useContractsStore } from '~~/stores/useContractsStore'
import { createContractFormFromRecord } from '~/validators/contract'

const contractsStore = useContractsStore()
const { showToast } = useToaster()
const { getErrorMessage } = useBackofficeApiFeedback()

const currentAuth = useState('auth:current-user', () => null as null | { permissions: string[] })
const canCreateContracts = computed(() => currentAuth.value?.permissions?.includes('contratos.create') ?? false)
const canUpdateContracts = computed(() => currentAuth.value?.permissions?.includes('contratos.update') ?? false)
const canRenewContracts = computed(() => currentAuth.value?.permissions?.includes('contratos.renew') ?? false)
const canGenerateContracts = computed(() => currentAuth.value?.permissions?.includes('contratos.generate') ?? false)

const pageMeta = {
  title: 'Contratos',
  description: 'Gerencie contratos comerciais, propostas e vigências com contexto financeiro.',
}

const breadcrumb = {
  routes: [{ label: 'Contratos' }],
}

const columns: AppTableColumn[] = [
  { key: 'title', title: 'Contrato' },
  { key: 'clientName', title: 'Cliente' },
  { key: 'status', title: 'Status', width: '140px' },
  { key: 'startDate', title: 'Início', width: '140px' },
  { key: 'expectedEndDate', title: 'Término', width: '140px' },
  { key: 'finalAmount', title: 'Valor final', width: '160px' },
  { key: 'actions', title: 'Ações', width: '144px', align: 'right' },
]

const statusFilterOptions = [
  { label: 'Todos os status', value: '' },
  ...contractStatusOptions,
]

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'renew'>('create')
const modalLoading = ref(false)
const historyOpen = ref(false)
const detailsOpen = ref(false)
const generateOpen = ref(false)
const requestError = ref('')
const generateError = ref('')
const actionLoadingId = ref('')
const statusLoadingId = ref('')
const historyLoading = ref(false)
const detailsLoading = ref(false)
const generateLoading = ref(false)
const editingRecord = ref<ContractRecord | null>(null)
const renewalTarget = ref<ContractRecord | null>(null)
const generationTarget = ref<ContractRecord | null>(null)
const historyItems = ref<ContractHistoryRecord[]>([])
const historyTitle = ref('Histórico do contrato')
const detailsRecord = ref<ContractRecord | null>(null)
const form = ref<ContractFormValues>(createEmptyContractForm())
const HISTORY_TITLE_MAX_LENGTH = 42
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const { status } = await useAsyncData('contracts-index', () => contractsStore.fetch())

const isLoading = computed(() => status.value === 'pending' || contractsStore.loading)
const isEmpty = computed(() => !isLoading.value && !contractsStore.data.length && !contractsStore.error)
const contractModalTitle = computed(() => {
  if (modalMode.value === 'renew') {
    return 'Renovar contrato'
  }

  if (modalMode.value === 'edit') {
    return 'Editar contrato'
  }

  return 'Novo contrato'
})

async function refreshList() {
  await contractsStore.fetch()
}

const handleSearch = useDebounceFn(async (value: string | number) => {
  contractsStore.setFilters({
    search: String(value),
    page: 1,
  })
  await refreshList()
}, 300)

async function handleStatusFilter(value: unknown) {
  contractsStore.setFilters({
    status: String(value) as ContractStatus | '',
    page: 1,
  })
  await refreshList()
}

async function handlePageChange(value: number) {
  contractsStore.setFilters({ page: value })
  await refreshList()
}

async function handlePageSizeChange(value: number) {
  contractsStore.setFilters({ page: 1, pageSize: value })
  await refreshList()
}

function openCreateModal() {
  modalMode.value = 'create'
  modalLoading.value = false
  editingRecord.value = null
  renewalTarget.value = null
  form.value = createEmptyContractForm()
  requestError.value = ''
  modalOpen.value = true
}

async function openEditModal(record: ContractRecord) {
  modalMode.value = 'edit'
  modalLoading.value = true
  actionLoadingId.value = record.id
  editingRecord.value = null
  renewalTarget.value = null
  requestError.value = ''
  modalOpen.value = true

  try {
    const latestRecord = await ContractsModule.get(record.id)
    editingRecord.value = latestRecord
    renewalTarget.value = null
    form.value = createContractFormFromRecord(latestRecord)
    requestError.value = ''
    modalOpen.value = true
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível carregar o contrato para edição.'), {
      title: 'Contratos',
      type: 'error',
    })
    modalOpen.value = false
  } finally {
    modalLoading.value = false
    actionLoadingId.value = ''
  }
}

async function openRenewModal(record: ContractRecord) {
  modalMode.value = 'renew'
  modalLoading.value = true
  actionLoadingId.value = record.id
  editingRecord.value = null
  renewalTarget.value = null
  requestError.value = ''
  modalOpen.value = true

  try {
    const latestRecord = await ContractsModule.get(record.id)
    editingRecord.value = null
    renewalTarget.value = latestRecord
    form.value = {
      ...createContractFormFromRecord(latestRecord),
      status: 'ACTIVE',
      startDate: '',
      expectedEndDate: '',
      firstDueDate: '',
    }
    requestError.value = ''
    modalOpen.value = true
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível carregar o contrato para renovação.'), {
      title: 'Contratos',
      type: 'error',
    })
    modalOpen.value = false
  } finally {
    modalLoading.value = false
    actionLoadingId.value = ''
  }
}

async function openGenerateModal(record: ContractRecord) {
  actionLoadingId.value = record.id

  try {
    generationTarget.value = await ContractsModule.get(record.id)
    generateError.value = ''
    generateOpen.value = true
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível carregar o contrato para gerar lançamentos.'), {
      title: 'Contratos',
      type: 'error',
    })
  } finally {
    actionLoadingId.value = ''
  }
}

async function handleSave(payload: ContractFormValues) {
  requestError.value = ''

  try {
    if (renewalTarget.value) {
      await ContractsModule.renew(renewalTarget.value.id, payload)
      showToast('Contrato renovado com sucesso.', { title: 'Contratos', type: 'success' })
    } else if (editingRecord.value) {
      await contractsStore.updateItem(editingRecord.value.id, payload)
      showToast('Contrato atualizado com sucesso.', { title: 'Contratos', type: 'success' })
    } else {
      await contractsStore.createItem(payload)
      showToast('Contrato criado com sucesso.', { title: 'Contratos', type: 'success' })
    }

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar o contrato.')
  }
}

async function openHistoryModal(record: ContractRecord) {
  historyOpen.value = true
  historyLoading.value = true
  historyTitle.value = truncateModalTitle(`Histórico de ${record.title}`, HISTORY_TITLE_MAX_LENGTH)

  try {
    const response = await ContractsModule.getHistory(record.id)
    historyItems.value = response.items
  } catch (error) {
    historyOpen.value = false
    showToast(getErrorMessage(error, 'Não foi possível carregar o histórico do contrato.'), {
      title: 'Contratos',
      type: 'error',
    })
  } finally {
    historyLoading.value = false
  }
}

function truncateModalTitle(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(parsed.valueOf())) {
    return value
  }

  return dateFormatter.format(parsed)
}

async function openDetailsModal(id: string) {
  detailsOpen.value = true
  detailsLoading.value = true

  try {
    detailsRecord.value = await ContractsModule.get(id)
  } catch (error) {
    detailsOpen.value = false
    showToast(getErrorMessage(error, 'Não foi possível carregar os detalhes do contrato.'), {
      title: 'Contratos',
      type: 'error',
    })
  } finally {
    detailsLoading.value = false
  }
}

async function handleGenerate(payload: ContractGenerationFormValues) {
  if (!generationTarget.value) {
    return
  }

  generateLoading.value = true
  generateError.value = ''

  try {
    const result = await ContractsModule.generate(generationTarget.value.id, payload)
    await refreshList()
    generateOpen.value = false
    showToast(`${result.count} lançamento(s) gerado(s) com sucesso.`, {
      title: 'Contratos',
      type: 'success',
    })
  } catch (error) {
    generateError.value = getErrorMessage(error, 'Não foi possível gerar os lançamentos do contrato.')
  } finally {
    generateLoading.value = false
  }
}

function closePopover(event?: MouseEvent) {
  const popover = event?.currentTarget instanceof HTMLElement
    ? event.currentTarget.closest('[popover]')
    : null

  if (popover instanceof HTMLElement && 'hidePopover' in popover) {
    ;(popover as HTMLElement & { hidePopover: () => void }).hidePopover()
  }
}

function runActionFromMenu(action: () => void | Promise<void>, event?: MouseEvent) {
  closePopover(event)
  void action()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getStatusLabel(value: string) {
  return contractStatusOptions.find(option => option.value === value)?.label ?? value
}

function getStatusBadgeAttrs(status: ContractStatus) {
  switch (status) {
    case 'ACTIVE':
      return { success: true }

    case 'PROPOSAL':
      return { info: true }

    case 'RENEWED':
      return { primary: true, outline: true }

    case 'CLOSED':
      return { warning: true }

    case 'CANCELED':
      return { danger: true, outline: true }

    case 'LOCKED':
      return { info: true, outline: true }

    default:
      return { outline: true }
  }
}

function getRenewalContext(row: ContractRecord) {
  const lines = [`${row.entriesCount} lançamento(s) vinculado(s)`]

  if (row.renewalOfTitle) {
    lines.push(`Renovação de: ${row.renewalOfTitle}`)
  }

  if (row.renewedByCount > 0) {
    lines.push(`Renovado por: ${row.renewedByCount} contrato(s)`)
  }

  return lines
}

function getChainBadge(row: ContractRecord) {
  if (row.renewalOfContractId && row.status === 'ACTIVE') {
    return { label: 'Atual', attrs: { primary: true } }
  }

  if (row.renewalOfContractId) {
    return { label: 'Renovação', attrs: { outline: true } }
  }

  if (row.renewedByCount > 0) {
    return { label: 'Origem', attrs: { info: true, outline: true } }
  }

  return null
}

function getChainBadgeLabel(row: ContractRecord) {
  return getChainBadge(row)?.label
}

function getChainBadgeAttrs(row: ContractRecord) {
  return getChainBadge(row)?.attrs
}

function createEmptyContractForm(): ContractFormValues {
  return {
    title: '',
    clientId: '',
    status: 'DRAFT',
    originalAmount: '',
    discountAmount: '',
    finalAmount: '',
    totalHours: '',
    weeklyHours: '',
    startDate: '',
    expectedEndDate: '',
    billingModel: 'CASH',
    billingFrequency: '',
    billingOccurrences: '',
    firstDueDate: '',
    notes: '',
    externalContractId: '',
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    :title="pageMeta.title"
    :description="pageMeta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="contractsStore.data"
    :loading="isLoading"
    :is-invalid="Boolean(contractsStore.error)"
    :error-message="contractsStore.error?.message"
    :page="contractsStore.filters.page"
    :total="contractsStore.total"
    :page-size="contractsStore.filters.pageSize"
    @update:page="handlePageChange"
    @update:page-size="handlePageSizeChange"
  )
    template(#toolbar)
      dd-input(
        :model-value="contractsStore.filters.search"
        icon="lucide:search"
        placeholder="Buscar contrato..."
        @update:model-value="handleSearch"
      )
      dd-select(
        :model-value="contractsStore.filters.status"
        :options="statusFilterOptions"
        placeholder="Todos os status"
        @update:model-value="handleStatusFilter"
      )
      dd-button(v-if="canCreateContracts" primary icon="lucide:plus" @click="openCreateModal") Novo contrato

    template(#cell-title="{ row }")
      dd-stack(compact nogap)
        dd-cluster(compact)
          strong {{ row.title }}
          dd-badge(
            v-if="getChainBadgeLabel(row)"
            v-bind="getChainBadgeAttrs(row)"
            tiny
          ) {{ getChainBadgeLabel(row) }}
        dd-stack(compact nogap :class="fin.renewalMeta")
          span(
            v-for="line in getRenewalContext(row)"
            :key="line"
            :class="fin.subcopy"
          ) {{ line }}

    template(#cell-status="{ row }")
      dd-badge(v-bind="getStatusBadgeAttrs(row.status)") {{ getStatusLabel(row.status) }}

    template(#cell-startDate="{ row }")
      span {{ formatDate(row.startDate) }}

    template(#cell-expectedEndDate="{ row }")
      span {{ formatDate(row.expectedEndDate) }}

    template(#cell-finalAmount="{ row }")
      strong {{ formatCurrency(row.finalAmount) }}

    template(#cell-actions="{ row }")
      dd-cluster(compact end)
        dd-button(
          v-if="canUpdateContracts"
          icon="lucide:pencil"
          icon-only
          ghost
          small
          aria-label="Editar contrato"
          @click="openEditModal(row)"
        )
        dd-popover(v-if="canUpdateContracts || canRenewContracts" trigger="click" placement="left-start")
          span(:class="fin.popoverTrigger")
            dd-button(
              icon="lucide:ellipsis-vertical"
              icon-only
              ghost
              small
              aria-label="Ações do contrato"
            )
          template(#content)
            dd-stack(nogap :class="fin.statusMenu")
              dd-button(
                v-if="canGenerateContracts && row.status === 'ACTIVE' && row.entriesCount === 0"
                ghost
                full
                primary
                icon="lucide:sparkles"
                :class="fin.statusOption"
                @click="runActionFromMenu(() => openGenerateModal(row), $event)"
              ) Gerar lançamentos
              dd-button(
                ghost
                full
                info
                icon="lucide:history"
                :class="fin.statusOption"
                @click="runActionFromMenu(() => openHistoryModal(row), $event)"
              ) Ver histórico
              dd-button(
                v-if="canRenewContracts && row.status === 'ACTIVE'"
                ghost
                full
                success
                icon="lucide:refresh-cw"
                :class="fin.statusOption"
                @click="runActionFromMenu(() => openRenewModal(row), $event)"
              ) Renovar contrato

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhum contrato encontrado"
        message="Use o módulo para registrar propostas, contratos ativos e vigências da operação."
      )

  backoffice-contract-modal-form(
    v-if="modalOpen"
    :open="modalOpen"
    :title="contractModalTitle"
    :model-value="form"
    :renewal-reference-end-date="renewalTarget?.expectedEndDate ?? null"
    :loading="modalLoading || contractsStore.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @save="handleSave"
  )

  backoffice-contract-history-modal(
    :open="historyOpen"
    :title="historyTitle"
    :items="historyItems"
    :loading="historyLoading"
    @view="openDetailsModal"
    @update:open="historyOpen = $event"
  )

  backoffice-contract-details-modal(
    :open="detailsOpen"
    :contract="detailsRecord"
    :loading="detailsLoading"
    @update:open="detailsOpen = $event"
  )

  backoffice-contract-generate-entries-modal(
    :open="generateOpen"
    :contract="generationTarget"
    :loading="generateLoading"
    :error-message="generateError"
    @update:open="generateOpen = $event"
    @generate="handleGenerate"
  )
</template>

<style module="fin">
.subcopy {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.renewalMeta {
  gap: 0;
}

.statusMenu {
  min-inline-size: 12rem;
}

.statusOption {
  justify-content: flex-start;
}

.popoverTrigger {
  display: inline-flex;
}
</style>
