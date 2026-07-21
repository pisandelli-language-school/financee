<script setup lang="ts">
import type { AppTableColumn, TagFormValues, TagRecord } from '~/types/backoffice'
import { useTagsStore } from '~~/stores/useTagsStore'

const store = useTagsStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('tags')
const form = ref<TagFormValues>(createEmptyTagForm())
const modalOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<TagRecord | null>(null)
const deleteTarget = ref<TagRecord | null>(null)
const requestError = ref('')

const columns: AppTableColumn[] = [
  { key: 'tag', title: 'Tag' },
  { key: 'status', title: 'Status', width: '120px' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const { status } = await useAsyncData('backoffice-tags', () => store.fetch())
const isLoading = computed(() => status.value === 'pending' || store.loading)
const isEmpty = computed(() => !isLoading.value && !store.data.length && !store.error)

async function refreshList() {
  requestError.value = ''
  await store.fetch()
}

// ⚡ Bolt: Debounce search to prevent excessive API calls and state updates
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
  form.value = createEmptyTagForm()
  requestError.value = ''
  modalOpen.value = true
}

function openEditModal(record: TagRecord) {
  editingRecord.value = record
  form.value = tagToForm(record)
  requestError.value = ''
  modalOpen.value = true
}

async function handleSave() {
  requestError.value = ''

  try {
    if (editingRecord.value) {
      await store.updateItem(editingRecord.value.id, form.value)
      showToast('Tag atualizada com sucesso.', { title: 'Tags', type: 'success' })
    } else {
      await store.createItem(form.value)
      showToast('Tag criada com sucesso.', { title: 'Tags', type: 'success' })
    }

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar a tag.')
  }
}

function askDelete(record: TagRecord) {
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
    showToast('Tag removida com sucesso.', { title: 'Tags', type: 'success' })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível excluir a tag.'), {
      title: 'Tags',
      type: 'error',
    })
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('tags')"
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
      dd-button(primary icon="lucide:plus" @click="openCreateModal") Nova tag

    template(#cell-tag="{ row }")
      dd-badge(:color="row.bgColor || '#F1F5F9'")
        span(:style="{ color: row.textColor || '#151A30' }") {{ row.name }}

    template(#cell-status="{ row }")
      dd-badge(:success="row.isActive" :warning="!row.isActive") {{ row.isActive ? 'Ativa' : 'Inativa' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditModal(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhuma tag cadastrada"
        message="Crie tags com ou sem cor para reaproveitamento em outras telas."
      )

  backoffice-tag-modal-form(
    :open="modalOpen"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.name || 'Tag'"
    description="Deseja excluir esta tag? O registro será ocultado dos fluxos ativos."
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>
