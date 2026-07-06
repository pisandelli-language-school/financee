<script setup lang="ts">
import type {
  AppTableColumn,
  NonBusinessDayFormValues,
  NonBusinessDayRecord,
} from '~/types/backoffice'
import { nonBusinessDayTypeOptions } from '~/types/backoffice'
import { useNonBusinessDaysStore } from '~~/stores/useNonBusinessDaysStore'

const store = useNonBusinessDaysStore()
const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const { getErrorMessage } = useBackofficeApiFeedback()
const { showToast } = useToaster()

const meta = getSectionMeta('dias-nao-uteis')
const form = ref<NonBusinessDayFormValues>(createEmptyNonBusinessDayForm())
const drawerOpen = ref(false)
const deleteOpen = ref(false)
const editingRecord = ref<NonBusinessDayRecord | null>(null)
const deleteTarget = ref<NonBusinessDayRecord | null>(null)
const requestError = ref('')
const fin = useCssModule('fin')

const typeFilterOptions = [
  { label: 'Todos os tipos', value: '' },
  ...nonBusinessDayTypeOptions,
]

const columns: AppTableColumn[] = [
  { key: 'title', title: 'Título' },
  { key: 'type', title: 'Tipo', width: '160px' },
  { key: 'description', title: 'Cadastro' },
  { key: 'scope', title: 'Escopo', width: '140px' },
  { key: 'actions', title: 'Ações', width: '112px', align: 'right' },
]

const { status } = await useAsyncData('backoffice-non-business-days', () => store.fetch())
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

async function handleTypeFilter(value: unknown) {
  store.setFilters({ type: String(value) as NonBusinessDayFormValues['type'] | '', page: 1 })
  await refreshList()
}

async function handlePageChange(value: number) {
  store.setFilters({ page: value })
  await refreshList()
}

function openCreateDrawer() {
  editingRecord.value = null
  form.value = createEmptyNonBusinessDayForm()
  requestError.value = ''
  drawerOpen.value = true
}

function openEditDrawer(record: NonBusinessDayRecord) {
  editingRecord.value = record
  form.value = nonBusinessDayToForm(record)
  requestError.value = ''
  drawerOpen.value = true
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

    drawerOpen.value = false
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
dd-stack(spaced :class="fin.page")
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
  )
    template(#notice)
      dd-alert(
        info
        title="Sábados e domingos"
        :closable="false"
        icon
      ) Sábados e domingos são considerados automaticamente. Cadastre apenas feriados fixos anuais, calculados ou exceções requeridas.

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
        :model-value="store.filters.type"
        :options="typeFilterOptions"
        placeholder="Todos os tipos"
        @update:model-value="handleTypeFilter"
      )
      dd-button(primary icon="lucide:plus" @click="openCreateDrawer") Novo dia não útil

    template(#cell-type="{ row }")
      dd-badge(v-if="row.type === 'FIXED'" success) Fixo anual
      dd-badge(v-else-if="row.type === 'CALCULATED'" warning) Calculado
      dd-badge(v-else info) Personalizado

    template(#cell-scope="{ row }")
      span {{ row.scope || '-' }}

    template(#cell-actions="{ row }")
      backoffice-row-actions(@edit="openEditDrawer(row)" @delete="askDelete(row)")

    template(#empty)
      backoffice-empty-state(
        v-if="isEmpty"
        title="Nenhum dia não útil cadastrado"
        message="Cadastre feriados fixos, datas calculadas e exceções operacionais."
      )

  backoffice-non-business-day-drawer-form(
    v-if="drawerOpen"
    :open="drawerOpen"
    :model-value="form"
    :loading="store.loading"
    :error-message="requestError"
    @update:open="drawerOpen = $event"
    @update:model-value="form = $event"
    @save="handleSave"
  )

  backoffice-delete-modal(
    :open="deleteOpen"
    :title="deleteTarget?.title || 'Dia não útil'"
    description="Deseja excluir este dia não útil?"
    @update:open="deleteOpen = $event"
    @confirm="confirmDelete"
  )
</template>

<style module="fin">
.page {
  gap: 24px;
}

.field {
  flex: 1 1 220px;
}
</style>
