<script setup lang="ts">
import type { AccountFormValues, AccountRecord, AppTableColumn } from '~/types/backoffice'
import { useAccountsStore } from '~~/stores/useAccountsStore'

const store = useAccountsStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('contas-carteiras')
const form = ref<AccountFormValues>(createEmptyAccountForm())
const modalOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<AccountRecord | null>(null)
const deleteTarget = ref<AccountRecord | null>(null)
const requestError = ref('')
const columns: AppTableColumn[] = []

const { status } = await useAsyncData('backoffice-accounts', () => store.fetch())
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
  form.value = createEmptyAccountForm()
  requestError.value = ''
  modalOpen.value = true
}

function openEditModal(record: AccountRecord) {
  editingRecord.value = record
  form.value = accountToForm(record)
  requestError.value = ''
  modalOpen.value = true
}

async function handleSave() {
  requestError.value = ''

  try {
    if (editingRecord.value) {
      await store.updateItem(editingRecord.value.id, form.value)
      showToast('Conta atualizada com sucesso.', {
        title: 'Contas e carteiras',
        type: 'success',
      })
    } else {
      await store.createItem(form.value)
      showToast('Conta criada com sucesso.', {
        title: 'Contas e carteiras',
        type: 'success',
      })
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
    showToast('Conta removida com sucesso.', {
      title: 'Contas e carteiras',
      type: 'success',
    })
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

    template(#content)
      dd-grid(v-if="isLoading" :class="fin.grid")
        dd-card(v-for="index in 3" :key="index")
          dd-stack(compact)
            dd-cluster(compact)
              dd-skeleton(circle block-size="2.5rem" inline-size="2.5rem")
              dd-stack(compact nogap)
                dd-skeleton(block-size="1rem" inline-size="10rem")
                dd-skeleton(block-size=".875rem" inline-size="7rem")
            dd-stack(compact nogap)
              dd-skeleton(block-size=".875rem" inline-size="5rem")
              dd-skeleton(block-size="1.75rem" inline-size="8rem")
            dd-cluster(compact)
              dd-skeleton(block-size="2rem" inline-size="5.5rem")
              dd-skeleton(block-size="2rem" inline-size="5.5rem")

      dd-alert(v-else-if="store.error" danger title="Contas e carteiras" :closable="false" icon)
        | {{ store.error.message }}

      dd-grid(v-else-if="store.data.length" :class="fin.grid")
        backoffice-account-card(
          v-for="account in store.data"
          :key="account.id"
          :account="account"
          @edit="openEditModal"
          @delete="askDelete"
        )

      backoffice-empty-state(
        v-else-if="isEmpty"
        title="Nenhuma conta cadastrada"
        message="Cadastre a primeira conta ou carteira para iniciar a base financeira."
      )

  backoffice-account-modal-form(
    :open="modalOpen"
    :title="editingRecord ? 'Editar conta' : 'Nova conta'"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    :is-editing="Boolean(editingRecord)"
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

<style module="fin">
.grid {
  --dd-grid-column-min-width: 20rem;
}
</style>
