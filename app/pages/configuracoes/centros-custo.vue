<script setup lang="ts">
import type { AppTableColumn, CostCenterRecord, SimpleCatalogFormValues } from '~/types/backoffice'
import { useCostCentersStore } from '~~/stores/useCostCentersStore'

const store = useCostCentersStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('centros-custo')
const form = ref<SimpleCatalogFormValues>(createEmptySimpleForm())
const drawerOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<CostCenterRecord | null>(null)
const deleteTarget = ref<CostCenterRecord | null>(null)
const requestError = ref('')
const fin = useCssModule('fin')

const columns: AppTableColumn[] = [
  { key: 'name', title: 'Centro de custo' },
  { key: 'status', title: 'Status', width: '120px' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const { status } = await useAsyncData('backoffice-cost-centers', () => store.fetch())
const isLoading = computed(() => status.value === 'pending' || store.loading)
const isEmpty = computed(() => !isLoading.value && !store.data.length && !store.error)

async function refreshList() {
  requestError.value = ''
  await store.fetch()
}

async function handleSearch(value: string | number) {
  store.setFilters({ search: String(value), page: 1 })
  await refreshList()
}

async function handlePageChange(value: number) {
  store.setFilters({ page: value })
  await refreshList()
}

function openCreateDrawer() {
  editingRecord.value = null
  form.value = createEmptySimpleForm()
  requestError.value = ''
  drawerOpen.value = true
}

function openEditDrawer(record: CostCenterRecord) {
  editingRecord.value = record
  form.value = simpleRecordToForm(record)
  requestError.value = ''
  drawerOpen.value = true
}

async function handleSave() {
  requestError.value = ''

  try {
    if (editingRecord.value) {
      await store.updateItem(editingRecord.value.id, form.value)
      showToast('Centro de custo atualizado com sucesso.', { title: 'Centros de custo', type: 'success' })
    } else {
      await store.createItem(form.value)
      showToast('Centro de custo criado com sucesso.', { title: 'Centros de custo', type: 'success' })
    }

    drawerOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar o centro de custo.')
  }
}

function askDelete(record: CostCenterRecord) {
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
    showToast('Centro de custo removido com sucesso.', { title: 'Centros de custo', type: 'success' })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível excluir o centro de custo.'), {
      title: 'Centros de custo',
      type: 'error',
    })
  }
}
</script>

<template lang="pug">
dd-stack(spaced :class="fin.page")
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('centros-custo')"
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
  )
    template(#toolbar)
      dd-input(
        :class="fin.search"
        :model-value="store.filters.search"
        icon="lucide:search"
        placeholder="Buscar..."
        @update:model-value="handleSearch"
      )
      dd-button(primary icon="lucide:plus" @click="openCreateDrawer") Novo centro

    template(#cell-status="{ row }")
      dd-badge(:success="row.isActive" :warning="!row.isActive") {{ row.isActive ? 'Ativo' : 'Inativo' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditDrawer(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhum centro de custo cadastrado"
        message="Crie centros para melhorar a análise e a classificação financeira."
      )

  backoffice-simple-entity-drawer-form(
    :open="drawerOpen"
    :title="editingRecord ? 'Editar centro de custo' : 'Novo centro de custo'"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    @update:open="drawerOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.name || 'Centro de custo'"
    description="Deseja excluir este centro de custo?"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>

<style module="fin">
.page {
  gap: 24px;
}

.search {
  flex: 1 1 260px;
}
</style>
