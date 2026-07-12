<script setup lang="ts">
import { CategoryModule } from '~/api/backoffice'
import { useCategoriesStore } from '~~/stores/useCategoriesStore'
import type {
  AppTableColumn,
  CategoryFormValues,
  CategoryRecord,
} from '~/types/backoffice'
import { categoryTypeOptions } from '~/types/backoffice'

const categoriesStore = useCategoriesStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage, getDeleteBlockReason } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('categorias')
const form = ref<CategoryFormValues>(createEmptyCategoryForm())
const parentOptions = ref<CategoryRecord[]>([])
const editingRecord = ref<CategoryRecord | null>(null)
const modalOpen = ref(false)
const deleteOpen = ref(false)
const deleteTarget = ref<CategoryRecord | null>(null)
const requestError = ref('')
const deleteDescription = ref('Deseja excluir esta categoria? O registro será ocultado dos fluxos ativos.')

const columns: AppTableColumn[] = [
  { key: 'name', title: 'Categoria' },
  { key: 'type', title: 'Tipo', width: '180px' },
  { key: 'subcategory', title: 'Subcategoria de' },
  { key: 'status', title: 'Status', width: '120px' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const typeFilterOptions = [
  { label: 'Todos os tipos', value: '' },
  ...categoryTypeOptions,
]

const { status } = await useAsyncData('backoffice-categories', () => categoriesStore.fetch())

const isLoading = computed(() => status.value === 'pending' || categoriesStore.loading)
const isEmpty = computed(() => !isLoading.value && !categoriesStore.data.length && !categoriesStore.error)

async function fetchParentOptions() {
  const response = await CategoryModule.list({
    search: '',
    type: form.value.type,
    page: 1,
    pageSize: 100,
  })

  parentOptions.value = response.items
}

async function refreshList() {
  requestError.value = ''
  await categoriesStore.fetch()
}

const debouncedRefresh = useDebounceFn(() => {
  refreshList()
}, 300)

function handleSearch(value: string | number) {
  categoriesStore.setFilters({
    search: String(value),
    page: 1,
  })
  debouncedRefresh()
}

async function handleTypeFilter(value: unknown) {
  categoriesStore.setFilters({
    type: String(value) as CategoryFormValues['type'] | '',
    page: 1,
  })
  await refreshList()
}

async function handlePageChange(value: number) {
  categoriesStore.setFilters({ page: value })
  await refreshList()
}

async function handlePageSizeChange(value: number) {
  categoriesStore.setFilters({ page: 1, pageSize: value })
  await refreshList()
}

async function openCreateModal() {
  editingRecord.value = null
  form.value = createEmptyCategoryForm()
  requestError.value = ''
  await fetchParentOptions()
  modalOpen.value = true
}

async function openEditModal(record: CategoryRecord) {
  editingRecord.value = record
  form.value = categoryToForm(record)
  requestError.value = ''
  await fetchParentOptions()
  modalOpen.value = true
}

async function handleSave() {
  requestError.value = ''

  try {
    if (editingRecord.value) {
      await categoriesStore.updateItem(editingRecord.value.id, form.value)
      showToast('Categoria atualizada com sucesso.', {
        title: 'Categorias',
        type: 'success',
      })
    } else {
      await categoriesStore.createItem(form.value)
      showToast('Categoria criada com sucesso.', {
        title: 'Categorias',
        type: 'success',
      })
    }

    modalOpen.value = false
    await fetchParentOptions()
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar a categoria.')
  }
}

function askDelete(record: CategoryRecord) {
  deleteTarget.value = record
  deleteDescription.value = 'Deseja excluir esta categoria? O registro será ocultado dos fluxos ativos.'
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) {
    return
  }

  try {
    await categoriesStore.removeItem(deleteTarget.value.id)
    showToast('Categoria removida com sucesso.', {
      title: 'Categorias',
      type: 'success',
    })
    deleteOpen.value = false
  } catch (error) {
    const blocked = getDeleteBlockReason(error)

    if (blocked) {
      deleteDescription.value = blocked.description
      return
    }

    showToast(getErrorMessage(error, 'Não foi possível excluir a categoria.'), {
      title: 'Categorias',
      type: 'error',
    })
  }
}

watch(
  () => form.value.type,
  async () => {
    if (modalOpen.value) {
      await fetchParentOptions()
    }
  },
)
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('categorias')"
    :title="meta.title"
    :description="meta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="categoriesStore.data"
    :loading="isLoading"
    :is-invalid="Boolean(categoriesStore.error)"
    :error-message="categoriesStore.error?.message"
    :page="categoriesStore.filters.page"
    :total="categoriesStore.total"
    :page-size="categoriesStore.filters.pageSize"
    @update:page="handlePageChange"
    @update:page-size="handlePageSizeChange"
  )
    template(#toolbar)
      dd-input(
        :model-value="categoriesStore.filters.search"
        icon="lucide:search"
        placeholder="Buscar..."
        @update:model-value="handleSearch"
      )
      dd-select(
        :model-value="categoriesStore.filters.type"
        :options="typeFilterOptions"
        placeholder="Todos os tipos"
        @update:model-value="handleTypeFilter"
      )
      dd-button(primary icon="lucide:plus" @click="openCreateModal") Nova categoria

    template(#cell-type="{ row }")
      dd-badge(
        v-if="row.type === 'INCOME'"
        success
      ) Entrada
      dd-badge(
        v-else-if="row.type === 'EXPENSE'"
        warning
      ) Saída
      dd-badge(v-else info) Outros

    template(#cell-subcategory="{ row }")
      span {{ row.parentName || '-' }}

    template(#cell-status="{ row }")
      dd-badge(:success="row.isActive" :warning="!row.isActive") {{ row.isActive ? 'Ativa' : 'Inativa' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditModal(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhuma categoria encontrada"
        message="Ajuste os filtros ou cadastre uma nova categoria."
      )

  backoffice-category-modal-form(
    v-if="modalOpen"
    :open="modalOpen"
    :title="editingRecord ? 'Editar categoria' : 'Nova categoria'"
    :model-value="form"
    :categories="parentOptions"
    :editing-id="editingRecord?.id ?? null"
    :loading="categoriesStore.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.name || 'Categoria'"
    :description="deleteDescription"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>
