<script setup lang="ts">
import type { NotificationFilters, NotificationRecord, NotificationSeverity } from '~/types/notifications'
import type { AppTableColumn } from '~/types/backoffice'
import { useNotificationsStore } from '~~/stores/useNotificationsStore'

const notificationsStore = useNotificationsStore()

const breadcrumb = {
  routes: [
    { label: 'Notificações' },
  ],
}

const severityOptions = [
  { label: 'Todas as severidades', value: '' },
  { label: 'Info', value: 'INFO' },
  { label: 'Atenção', value: 'WARNING' },
  { label: 'Crítica', value: 'CRITICAL' },
]

const statusOptions = [
  { label: 'Todos os status', value: '' },
  { label: 'Não lidas', value: 'unread' },
  { label: 'Lidas', value: 'read' },
]

const columns: AppTableColumn[] = [
  { key: 'severity', title: 'Tipo', width: '92px', align: 'center' },
  { key: 'title', title: 'Notificação' },
  { key: 'createdAt', title: 'Data', width: '120px' },
  { key: 'actions', title: 'Ações', width: '144px', align: 'center' },
]

const severityMetaMap: Record<NotificationSeverity, {
  label: string
  icon: string
  badge: 'info' | 'warning' | 'danger'
}> = {
  INFO: {
    label: 'Info',
    icon: 'lucide:info',
    badge: 'info',
  },
  WARNING: {
    label: 'Atenção',
    icon: 'lucide:badge-alert',
    badge: 'warning',
  },
  CRITICAL: {
    label: 'Crítica',
    icon: 'lucide:triangle-alert',
    badge: 'danger',
  },
}

watch(() => [
  notificationsStore.filters.severity,
  notificationsStore.filters.status,
  notificationsStore.filters.page,
  notificationsStore.filters.pageSize,
] as const, async () => {
  await notificationsStore.fetchList({ force: true })
}, { immediate: true })

onMounted(() => {
  void notificationsStore.fetchUnreadCount({ force: true })
})

const handleSeverity = useDebounceFn((value: string) => {
  notificationsStore.setFilters({
    severity: value as NotificationFilters['severity'],
    page: 1,
  })
}, 0)

const handleStatus = useDebounceFn((value: string) => {
  notificationsStore.setFilters({
    status: value as NotificationFilters['status'],
    page: 1,
  })
}, 0)

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(value))
}

function getContextLabel(notification: NotificationRecord) {
  const metadata = notification.metadata ?? {}

  if (typeof metadata.contractTitle === 'string' && typeof metadata.clientName === 'string') {
    return `${metadata.contractTitle} · ${metadata.clientName}`
  }

  if (typeof metadata.description === 'string' && typeof metadata.contactName === 'string' && metadata.contactName.length > 0) {
    return `${metadata.description} · ${metadata.contactName}`
  }

  if (typeof metadata.description === 'string') {
    return metadata.description
  }

  if (typeof metadata.month === 'string') {
    return `Período ${metadata.month}`
  }

  return null
}

async function handleOpen(notification: NotificationRecord) {
  if (notificationsStore.actionLoading || !notification.actionUrl) {
    return
  }

  if (!notification.isRead) {
    await notificationsStore.markAsRead(notification.id)
  }

  await navigateTo(notification.actionUrl)
}

async function handleMarkAsRead(id: string) {
  if (notificationsStore.actionLoading) {
    return
  }

  await notificationsStore.markAsRead(id)
}

function getSeverityMeta(severity: unknown) {
  if (severity === 'CRITICAL' || severity === 'WARNING' || severity === 'INFO') {
    return severityMetaMap[severity]
  }

  return severityMetaMap.INFO
}

function getSeverityTone(severity: unknown) {
  if (severity === 'CRITICAL') {
    return 'danger'
  }

  if (severity === 'WARNING') {
    return 'warning'
  }

  return 'info'
}
</script>

<template lang="pug">
dd-stack
  backoffice-page-header(
    :breadcrumb="breadcrumb"
    title="Notificações"
    description="Acompanhe alertas persistentes, marque leituras e remova notificações que já não exigem ação."
  )

  backoffice-list-panel(
    :columns="columns"
    :data="notificationsStore.data"
    :loading="notificationsStore.loading"
    :is-invalid="Boolean(notificationsStore.error)"
    :error-message="notificationsStore.error?.message ?? ''"
    :page="notificationsStore.filters.page"
    :total="notificationsStore.total"
    :page-size="notificationsStore.filters.pageSize"
    @update:page="notificationsStore.setFilters({ page: $event })"
    @update:page-size="notificationsStore.setFilters({ pageSize: $event, page: 1 })"
  )
    template(#toolbar)
      dd-select(
        :model-value="notificationsStore.filters.severity"
        :options="severityOptions"
        placeholder="Todas as severidades"
        @update:model-value="handleSeverity(String($event ?? ''))"
      )
      dd-select(
        :model-value="notificationsStore.filters.status"
        :options="statusOptions"
        placeholder="Todos os status"
        @update:model-value="handleStatus(String($event ?? ''))"
      )
      dd-button(
        ghost
        success
        icon="lucide:check-check"
        :disabled="notificationsStore.actionLoading || notificationsStore.unreadCount === 0"
        @click="notificationsStore.markAllAsRead()"
      ) Marcar todas como lidas

    template(#cell-severity="{ row }")
      span(
        :class="fin.severityIcon"
        :data-severity="getSeverityTone(row.severity)"
        :data-is-read="row.isRead"
        :data-notification-read="row.isRead"
        :title="getSeverityMeta(row.severity).label"
        :aria-label="getSeverityMeta(row.severity).label"
      )
        icon(:name="getSeverityMeta(row.severity).icon")

    template(#cell-title="{ row }")
      dd-stack(compact nogap)
        dd-cluster(compact :class="fin.titleRow")
          strong(:class="[fin.title, row.isRead && fin.titleRead]") {{ row.title }}
          dd-badge(v-if="row.isPriority" :color="row.isRead ? 'secondary' : 'danger'") Prioridade
        span(v-if="getContextLabel(row)" :class="[fin.context, row.isRead && fin.textRead]") {{ getContextLabel(row) }}
        span(:class="[fin.message, row.isRead && fin.textRead]") {{ row.message }}

    template(#cell-createdAt="{ row }")
      span(:class="[fin.date, row.isRead && fin.textRead]") {{ formatDate(row.createdAt) }}

    template(#cell-actions="{ row }")
      dd-cluster(compact :class="fin.actions")
        dd-popover(v-if="row.actionUrl" trigger="hover" placement="top" :offset="6")
          dd-button(
            ghost
            tiny
            icon-only
            icon="lucide:square-arrow-out-up-right"
            aria-label="Abrir contexto da notificação"
            :disabled="notificationsStore.actionLoading"
            @click="handleOpen(row)"
          )
          template(#content)
            span Abrir contexto
        dd-popover(v-if="!row.isRead" trigger="hover" placement="top" :offset="6")
          dd-button(
            ghost
            tiny
            icon-only
            success
            icon="lucide:check"
            aria-label="Marcar notificação como lida"
            :disabled="notificationsStore.actionLoading"
            @click="handleMarkAsRead(row.id)"
          )
          template(#content)
            span Marcar como lida
        dd-popover(trigger="hover" placement="top" :offset="6")
          dd-button(
            ghost
            tiny
            icon-only
            danger
            icon="lucide:trash-2"
            aria-label="Excluir notificação"
            :disabled="notificationsStore.actionLoading"
            @click="notificationsStore.deleteItem(row.id)"
          )
          template(#content)
            span Excluir notificação

    template(#empty)
      backoffice-empty-state(
        icon="lucide:bell-off"
        title="Nenhuma notificação encontrada"
        message="Ajuste os filtros ou aguarde novos eventos do sistema."
      )
</template>

<style module="fin">
.titleRow {
  align-items: center;
  gap: v('space.xs');
}

.title {
  line-height: v('line-height.tight');
}

.titleRead {
  color: v('color.gray');
}

.context,
.message,
.date {
  color: v('color.gray');
  font-size: v('font-size.sm');
}

.textRead {
  color: v('color.gray');
}

.actions {
  justify-content: center;
  flex-wrap: nowrap;
}

.severityIcon {
  align-items: center;
  display: inline-flex;
  font-size: 1.2rem;
  justify-content: center;
}

.severityIcon[data-severity='danger'] {
  color: v('color.danger.500');
}

.severityIcon[data-severity='warning'] {
  color: v('color.warning.500');
}

.severityIcon[data-severity='info'] {
  color: v('color.info.500');
}

.severityIcon[data-is-read='true'] {
  --dd-badge-base-color: v('color.gray');
  color: v('color.gray');
}

tbody tr:has([data-notification-read='true']) {
  background-color: color-mix(in srgb, v('color.light-gray') 35%, v('color.bg.surface'));
}
</style>
