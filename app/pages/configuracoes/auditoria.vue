<script setup lang="ts">
import { AuditModule } from '~/api/auth'
import type { AppTableColumn } from '~/types/backoffice'
import type { AuditLogDetailRecord, AuditLogRecord } from '~/types/auth'
import { useAuditStore } from '~~/stores/useAuditStore'

const { getBreadcrumb, getSectionMeta } = useBackofficeSections()
const auditStore = useAuditStore()
const { getErrorMessage } = useBackofficeApiFeedback()

const meta = getSectionMeta('auditoria')
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailEntry = ref<AuditLogDetailRecord | null>(null)
const severityOptions = [
  { label: 'Todas as severidades', value: '' },
  { label: 'Info', value: 'INFO' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Critical', value: 'CRITICAL' },
]

const columns: AppTableColumn[] = [
  { key: 'createdAt', title: 'Data' },
  { key: 'severity', title: 'Severidade' },
  { key: 'eventType', title: 'Evento' },
  { key: 'entityType', title: 'Entidade' },
  { key: 'userEmail', title: 'Usuário' },
  { key: 'actions', title: 'Ações', width: '64px', align: 'right' },
]

watch(() => [
  auditStore.filters.search,
  auditStore.filters.severity,
  auditStore.filters.dateFrom,
  auditStore.filters.dateTo,
  auditStore.filters.page,
  auditStore.filters.pageSize,
] as const, async () => {
  await auditStore.fetch()
}, { immediate: true })

const handleSearch = useDebounceFn((value: string) => {
  auditStore.setFilters({
    search: value,
    page: 1,
  })
}, 300)

function handleSeverity(value: string) {
  auditStore.setFilters({
    severity: value,
    page: 1,
  })
}

function handleDateFrom(value: string) {
  auditStore.setFilters({
    dateFrom: value,
    page: 1,
  })
}

function handleDateTo(value: string) {
  auditStore.setFilters({
    dateTo: value,
    page: 1,
  })
}

function severityColor(value: string) {
  if (value === 'CRITICAL') {
    return 'danger'
  }

  if (value === 'WARNING') {
    return 'warning'
  }

  return 'info'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function openDetailModal(row: AuditLogRecord) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detailEntry.value = null

  try {
    detailEntry.value = await AuditModule.getById(row.id)
  } catch (error) {
    detailError.value = getErrorMessage(error, 'Não foi possível carregar os detalhes da auditoria.')
  } finally {
    detailLoading.value = false
  }
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="getBreadcrumb('auditoria')"
    :title="meta.title"
    :description="meta.description"
  )

  backoffice-list-panel(
    :columns="columns"
    :data="auditStore.data"
    :loading="auditStore.loading"
    :is-invalid="Boolean(auditStore.error)"
    :error-message="auditStore.error?.message ?? ''"
    :page="auditStore.filters.page"
    :total="auditStore.total"
    :page-size="auditStore.filters.pageSize"
    @update:page="auditStore.setFilters({ page: $event })"
    @update:page-size="auditStore.setFilters({ pageSize: $event, page: 1 })"
  )
    template(#toolbar)
      dd-input(
        :model-value="auditStore.filters.search"
        icon="lucide:search"
        placeholder="Buscar evento"
        @update:model-value="handleSearch"
      )
      dd-select(
        :model-value="auditStore.filters.severity"
        placeholder="Todas as severidades"
        :options="severityOptions"
        @update:model-value="handleSeverity(String($event ?? ''))"
      )
      dd-input(
        :model-value="auditStore.filters.dateFrom"
        type="date"
        placeholder="Data inicial"
        @update:model-value="handleDateFrom(String($event ?? ''))"
      )
      dd-input(
        :model-value="auditStore.filters.dateTo"
        type="date"
        placeholder="Data final"
        @update:model-value="handleDateTo(String($event ?? ''))"
      )

    template(#cell-createdAt="{ row }")
      span {{ formatDateTime(row.createdAt) }}

    template(#cell-severity="{ row }")
      dd-badge(:color="severityColor(row.severity)") {{ row.severity }}

    template(#cell-actions="{ row }")
      dd-button(
        ghost
        tiny
        icon-only
        info
        type="button"
        icon="lucide:eye"
        aria-label="Ver detalhes da auditoria"
        @click="openDetailModal(row)"
      )

  backoffice-audit-detail-modal(
    v-if="detailOpen"
    :open="detailOpen"
    :entry="detailEntry"
    :loading="detailLoading"
    :error-message="detailError"
    @update:open="detailOpen = $event"
  )
</template>
