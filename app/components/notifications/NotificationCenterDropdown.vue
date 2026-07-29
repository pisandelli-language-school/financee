<script setup lang="ts">
import NotificationListItem from '~/components/notifications/NotificationListItem.vue'
import type { NotificationRecord } from '~/types/notifications'
import { useNotificationsStore } from '~~/stores/useNotificationsStore'

const notificationsStore = useNotificationsStore()

onMounted(() => {
  void Promise.all([
    notificationsStore.fetchPreview(),
    notificationsStore.fetchUnreadCount(),
  ])
})

async function handleOpen(notification: NotificationRecord) {
  if (notificationsStore.actionLoading) {
    return
  }

  if (!notification.isRead) {
    await notificationsStore.markAsRead(notification.id)
  }

  if (notification.actionUrl) {
    await navigateTo(notification.actionUrl)
  }
}
</script>

<template lang="pug">
dd-stack(:class="fin.panel")
  dd-cluster(between :class="fin.header")
    dd-stack(compact nogap)
      strong Central de notificações
      span(:class="fin.subtitle") {{ notificationsStore.unreadCount }} não lida(s)
    dd-button(
      ghost
      small
      success
      icon="lucide:check-check"
      :disabled="notificationsStore.actionLoading || notificationsStore.unreadCount === 0"
      @click="notificationsStore.markAllAsRead()"
    ) Marcar todas como lidas

  dd-stack(v-if="notificationsStore.preview.length" compact :class="fin.list")
    NotificationListItem(
      v-for="notification in notificationsStore.preview"
      :key="notification.id"
      :notification="notification"
      compact
      :busy="notificationsStore.actionLoading"
      @open="handleOpen"
      @read="notificationsStore.markAsRead"
      @delete="notificationsStore.deleteItem"
    )

  dd-center(v-else :class="fin.empty")
    dd-stack(compact nogap)
      strong Tudo em dia
      span(:class="fin.subtitle") Nenhuma notificação pendente agora.

  dd-cluster(end)
    dd-button(ghost small to="/notificacoes") Ver todas as notificações
</template>

<style module="fin">
.panel {
  inline-size: min(26rem, 85vw);
}

.header {
  align-items: flex-start;
  gap: v('space.sm');
}

.subtitle {
  color: v('color.text.soft');
  font-size: v('font-size.sm');
}

.list {
  max-block-size: 24rem;
  overflow: auto;
}

.empty {
  min-block-size: 8rem;
  text-align: center;
}
</style>
