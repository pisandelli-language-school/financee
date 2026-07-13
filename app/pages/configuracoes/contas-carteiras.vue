<script setup lang="ts">
import type { AccountRecord, AppTableColumn, SimpleCatalogFormValues } from '~/types/backoffice'
import { accountTypeOptions } from '~/types/backoffice'
import { useAccountsStore } from '~~/stores/useAccountsStore'

const store = useAccountsStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('contas-carteiras')
const form = ref<SimpleCatalogFormValues>(createEmptySimpleForm())
const modalOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<AccountRecord | null>(null)
const deleteTarget = ref<AccountRecord | null>(null)
const requestError = ref('')
const accountTypeLabelMap = new Map(accountTypeOptions.map((option) => [option.value, option.label]))

const columns: AppTableColumn[] = [
  { key: 'name', title: 'Conta' },
  { key: 'type', title: 'Tipo', width: '180px' },
  { key: 'initialValue', title: 'Saldo inicial', width: '160px', align: 'right' },
  { key: 'status', title: 'Status', width: '120px' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const { status } = await useAsyncData('backoffice-accounts', () => store.fetch())
const isLoading = computed(() => status.value === 'pending' || store.loading)
const isEmpty = computed(() => !isLoading.value && !store.data.length && !store.error)

async function refreshList() {
  requestError.value = ''
  await store.fetch()
}

// Debounce search to prevent excessive API requests
const debouncedRefreshList = useDebounceFn(refreshList, 300)

async function handleSearch(value: string | number) {
  store.setFilters({ search: String(value), page: 1 })
  await debouncedRefreshList()
}

async function handlePageChange(value: number) {
  store.setFilters({ page: value })
  await refreshList()
}

async function handlePageSizeChange(value: number) {
  store.setFilters({ page: 1, pageSize: value })
  await refreshList()
}

function openCreateModal() {
  editingRecord.value = null
  form.value = createEmptySimpleForm()
  requestError.value = ''
  modalOpen.value = true
}

function openEditModal(record: AccountRecord) {
  editingRecord.value = record
  form.value = simpleRecordToForm(record)
  requestError.value = ''
  modalOpen.value = true
}

async function handleSave() {
  requestError.value = ''

  try {
    if (editingRecord.value) {
      await store.updateItem(editingRecord.value.id, form.value)
      showToast('Conta atualizada com sucesso.', { title: 'Contas e carteiras', type: 'success' })
    } else {
      await store.createItem(form.value)
      showToast('Conta criada com sucesso.', { title: 'Contas e carteiras', type: 'success' })
    }

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar a conta.')
  }
}

function askDelete(record: AccountRecord) {
  deleteTarget.value = record
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) {
    return
  }

  try {
    await store.removeItem(deleteTarget.value.id)
    deleteOpen.value = false
    showToast('Conta removida com sucesso.', { title: 'Contas e carteiras', type: 'success' })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível excluir a conta.'), {
      title: 'Contas e carteiras',
      type: 'error',
    })
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('contas-carteiras')"
    :title="meta.title"
    :description="meta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="store.data"
    :loading="isLoading"
    :is-invalid="Boolean(store.error)"
    :error-message="store.error?.message"
    :page="store.filters.page"
    :total="store.total"
    :page-size="store.filters.pageSize"
    @update:page="handlePageChange"
    @update:page-size="handlePageSizeChange"
  )
    template(#toolbar)
      dd-input(
        :model-value="store.filters.search"
        icon="lucide:search"
        placeholder="Buscar..."
        @update:model-value="handleSearch"
      )
      dd-button(primary icon="lucide:plus" @click="openCreateModal") Nova conta

    template(#cell-type="{ row }")
      span {{ row.type ? (accountTypeLabelMap.get(row.type) ?? row.type) : '-' }}

    template(#cell-initialValue="{ row }")
      span {{ row.initialValue == null ? '-' : row.initialValue.toFixed(2) }}

    template(#cell-status="{ row }")
      dd-badge(:success="row.isActive" :warning="!row.isActive") {{ row.isActive ? 'Ativa' : 'Inativa' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditModal(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhuma conta cadastrada"
        message="Cadastre a primeira conta ou carteira para iniciar a base financeira."
      )

  backoffice-account-modal-form(
    :open="modalOpen"
    :title="editingRecord ? 'Editar conta' : 'Nova conta'"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.name || 'Conta'"
    description="Deseja excluir esta conta ou carteira?"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>
