<script setup lang="ts">
import type {
  AppTableColumn,
  NonBusinessDayFormValues,
  NonBusinessDayRecord,
} from '~/types/backoffice'
import { nonBusinessDayScopeOptions, nonBusinessDayTypeOptions } from '~/types/backoffice'
import { useNonBusinessDaysStore } from '~~/stores/useNonBusinessDaysStore'

const store = useNonBusinessDaysStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('dias-nao-uteis')
const form = ref<NonBusinessDayFormValues>(createEmptyNonBusinessDayForm())
const modalOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<NonBusinessDayRecord | null>(null)
const deleteTarget = ref<NonBusinessDayRecord | null>(null)
const requestError = ref('')

const typeFilterOptions = [
  { label: 'Todos os tipos', value: '' },
  ...nonBusinessDayTypeOptions,
]
const scopeLabels = new Map(nonBusinessDayScopeOptions.map((option) => [option.value, option.label]))

const columns: AppTableColumn[] = [
  { key: 'title', title: 'Título' },
  { key: 'type', title: 'Tipo', width: '160px' },
  { key: 'description', title: 'Cadastro' },
  { key: 'scope', title: 'Escopo', width: '140px' },
  { key: 'status', title: 'Status', width: '120px' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const { status } = await useAsyncData('backoffice-non-business-days', () => store.fetch())
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

async function handleTypeFilter(value: unknown) {
  store.setFilters({ type: String(value) as NonBusinessDayFormValues['type'] | '', page: 1 })
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
  form.value = createEmptyNonBusinessDayForm()
  requestError.value = ''
  modalOpen.value = true
}

function openEditModal(record: NonBusinessDayRecord) {
  editingRecord.value = record
  form.value = nonBusinessDayToForm(record)
  requestError.value = ''
  modalOpen.value = true
}

async function handleSave() {
  requestError.value = ''

  try {
    if (editingRecord.value) {
      await store.updateItem(editingRecord.value.id, form.value)
      showToast('Dia não útil atualizado com sucesso.', { title: 'Dias não úteis', type: 'success' })
    } else {
      await store.createItem(form.value)
      showToast('Dia não útil criado com sucesso.', { title: 'Dias não úteis', type: 'success' })
    }

    modalOpen.value = false
  } catch (error) {
    requestError.value = getErrorMessage(error, 'Não foi possível salvar o dia não útil.')
  }
}

function askDelete(record: NonBusinessDayRecord) {
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
    showToast('Dia não útil removido com sucesso.', { title: 'Dias não úteis', type: 'success' })
  } catch (error) {
    showToast(getErrorMessage(error, 'Não foi possível excluir o dia não útil.'), {
      title: 'Dias não úteis',
      type: 'error',
    })
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('dias-nao-uteis')"
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
    template(#notice)
      dd-alert(
        info
        title="Domingos automáticos"
        :closable="false"
        icon
      ) Domingos são considerados automaticamente. Cadastre feriados fixos anuais, calculados e exceções específicas, incluindo sábados quando necessário.

    template(#toolbar)
      dd-input(

        :model-value="store.filters.search"
        icon="lucide:search"
        placeholder="Buscar..."
        @update:model-value="handleSearch"
      )
      dd-select(

        :model-value="store.filters.type"
        :options="typeFilterOptions"
        placeholder="Todos os tipos"
        @update:model-value="handleTypeFilter"
      )
      dd-button(primary icon="lucide:plus" @click="openCreateModal") Novo dia não útil

    template(#cell-type="{ row }")
      dd-badge(v-if="row.type === 'FIXED'" success) Fixo anual
      dd-badge(v-else-if="row.type === 'CALCULATED'" warning) Calculado
      dd-badge(v-else info) Personalizado

    template(#cell-scope="{ row }")
      span {{ row.scope ? scopeLabels.get(row.scope) || row.scope : '-' }}

    template(#cell-status="{ row }")
      dd-badge(:success="row.isActive" :warning="!row.isActive") {{ row.isActive ? 'Ativo' : 'Inativo' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditModal(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhum dia não útil cadastrado"
        message="Cadastre feriados fixos, datas calculadas e exceções operacionais."
      )

  backoffice-non-business-day-modal-form(
    v-if="modalOpen"
    :open="modalOpen"
    :title="editingRecord ? 'Editar dia não útil' : 'Novo dia não útil'"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    @update:open="modalOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.title || 'Dia não útil'"
    description="Deseja excluir este dia não útil? O registro será ocultado dos fluxos ativos."
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>
