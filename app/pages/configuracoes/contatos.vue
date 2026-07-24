<script setup lang="ts">
import type { AppTableColumn, ContactFormValues, ContactRecord } from '~/types/backoffice'
import { contactNatureOptions, contactRoleOptions } from '~/types/backoffice'
import { useContactsStore } from '~~/stores/useContactsStore'

const store = useContactsStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('contatos')
const form = ref<ContactFormValues>(createEmptyContactForm())
const modalOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<ContactRecord | null>(null)
const deleteTarget = ref<ContactRecord | null>(null)
const requestError = ref('')

const columns: AppTableColumn[] = [
  { key: 'name', title: 'Nome' },
  { key: 'roles', title: 'Papéis', width: '220px' },
  { key: 'nature', title: 'Natureza', width: '140px' },
  { key: 'email', title: 'Contato' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const roleFilterOptions = [
  { label: 'Todos os papéis', value: '' },
  ...contactRoleOptions,
]

const natureFilterOptions = [
  { label: 'Todas as naturezas', value: '' },
  ...contactNatureOptions,
]

const { status } = await useAsyncData('backoffice-contacts', () => store.fetch())
const isLoading = computed(() => status.value === 'pending' || store.loading)
const isEmpty = computed(() => !isLoading.value && !store.data.length && !store.error)

async function refreshList() {
  requestError.value = ''
  await store.fetch()
}

// Debounce search input to prevent excessive API calls while typing
const handleSearch = useDebounceFn(async (value: string | number) => {
  store.setFilters({ search: String(value), page: 1 })
  await refreshList()
}, 300)

async function handleRoleFilter(value: unknown) {
  store.setFilters({ role: String(value) as ContactFormValues['roles'][number] | '', page: 1 })
  await refreshList()
}

async function handleNatureFilter(value: unknown) {
  store.setFilters({ nature: String(value) as ContactFormValues['nature'] | '', page: 1 })
  await refreshList()
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
  form.value = createEmptyContactForm()
  requestError.value = ''
  modalOpen.value = true
}

function openEditModal(record: ContactRecord) {
  editingRecord.value = record
  form.value = contactToForm(record)
  requestError.value = ''
  modalOpen.value = true
}

async function handleSave(payload: ContactFormValues) {
  requestError.value = ''

  try {
    if (editingRecord.value) {
      await store.updateItem(editingRecord.value.id, payload)
      showToast('Contato atualizado com sucesso.', { title: 'Contatos', type: 'success' })
    } else {
      await store.createItem(payload)
      showToast('Contato criado com sucesso.', { title: 'Contatos', type: 'success' })
    }

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar o contato.')
  }
}

function askDelete(record: ContactRecord) {
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
    showToast('Contato removido com sucesso.', { title: 'Contatos', type: 'success' })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível excluir o contato.'), {
      title: 'Contatos',
      type: 'error',
    })
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('contatos')"
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
        :class="fin.field"
        :model-value="store.filters.search"
        icon="lucide:search"
        placeholder="Buscar..."
        @update:model-value="handleSearch"
      )
      dd-select(
        :class="fin.field"
        :model-value="store.filters.role"
        :options="roleFilterOptions"
        placeholder="Todos os papéis"
        @update:model-value="handleRoleFilter"
      )
      dd-select(
        :class="fin.field"
        :model-value="store.filters.nature"
        :options="natureFilterOptions"
        placeholder="Todas as naturezas"
        @update:model-value="handleNatureFilter"
      )
      dd-button(primary icon="lucide:plus" @click="openCreateModal") Novo contato

    template(#cell-roles="{ row }")
      dd-cluster(compact)
        dd-badge(
          v-for="role in row.roles"
          :key="role"
          outline
        ) {{ role === 'CLIENT' ? 'Cliente' : role === 'SUPPLIER' ? 'Fornecedor' : 'Outro' }}

    template(#cell-nature="{ row }")
      dd-badge(info) {{ row.nature === 'COMPANY' ? 'PJ' : row.nature === 'INDIVIDUAL' ? 'PF' : 'Estrangeiro' }}

    template(#cell-email="{ row }")
      dd-stack(compact nogap)
        span {{ row.email || '-' }}
        span(:class="fin.subcopy") {{ row.phone || row.document || '-' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditModal(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhum contato encontrado"
        message="Crie contatos com papéis múltiplos para contratos, cobranças e operação."
      )

  backoffice-contact-modal-form(
    v-if="modalOpen"
    :open="modalOpen"
    :title="editingRecord ? 'Editar contato' : 'Novo contato'"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.name || 'Contato'"
    description="Deseja excluir este contato?"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>

<style module="fin">
.subcopy {
  color: v('color.text.soft');
  font-size: v('font-size.xs');
}
</style>
