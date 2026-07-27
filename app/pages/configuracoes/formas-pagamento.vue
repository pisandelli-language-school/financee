<script setup lang="ts">
import type { AppTableColumn, PaymentMethodRecord, SimpleCatalogFormValues } from '~/types/backoffice'
import { usePaymentMethodsStore } from '~~/stores/usePaymentMethodsStore'

const store = usePaymentMethodsStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('formas-pagamento')
const form = ref<SimpleCatalogFormValues>(createEmptySimpleForm())
const modalOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<PaymentMethodRecord | null>(null)
const deleteTarget = ref<PaymentMethodRecord | null>(null)
const requestError = ref('')

const columns: AppTableColumn[] = [
  { key: 'name', title: 'Forma de pagamento' },
  { key: 'status', title: 'Status', width: '120px' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const { status } = await useAsyncData('backoffice-payment-methods', () => store.fetch())
const isLoading = computed(() => status.value === 'pending' || store.loading)
const isEmpty = computed(() => !isLoading.value && !store.data.length && !store.error)

async function refreshList() {
  requestError.value = ''
  await store.fetch()
}

const handleSearch = useDebounceFn(async (value: string | number) => {
  store.setFilters({ search: String(value), page: 1 })
  await refreshList()
}, 300)

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

function openEditModal(record: PaymentMethodRecord) {
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
      showToast('Forma de pagamento atualizada com sucesso.', { title: 'Formas de pagamento', type: 'success' })
    } else {
      await store.createItem(form.value)
      showToast('Forma de pagamento criada com sucesso.', { title: 'Formas de pagamento', type: 'success' })
    }

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar a forma de pagamento.')
  }
}

function askDelete(record: PaymentMethodRecord) {
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
    showToast('Forma de pagamento removida com sucesso.', { title: 'Formas de pagamento', type: 'success' })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível excluir a forma de pagamento.'), {
      title: 'Formas de pagamento',
      type: 'error',
    })
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('formas-pagamento')"
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
      dd-button(primary icon="lucide:plus" @click="openCreateModal") Nova forma

    template(#cell-status="{ row }")
      dd-badge(:success="row.isActive" :warning="!row.isActive") {{ row.isActive ? 'Ativa' : 'Inativa' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditModal(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhuma forma de pagamento cadastrada"
        message="Cadastre os meios informativos usados no financeiro."
      )

  backoffice-simple-entity-modal-form(
    :open="modalOpen"
    :title="editingRecord ? 'Editar forma de pagamento' : 'Nova forma de pagamento'"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.name || 'Forma de pagamento'"
    description="Deseja excluir esta forma de pagamento?"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>
