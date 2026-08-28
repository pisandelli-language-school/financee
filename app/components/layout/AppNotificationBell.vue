<script setup lang="ts">
import NotificationCenterDropdown from '~/components/notifications/NotificationCenterDropdown.vue'
import { useNotificationsStore } from '~~/stores/useNotificationsStore'

defineProps<{
  visible: boolean
}>()

const notificationsStore = useNotificationsStore()
</script>

<template lang="pug">
ClientOnly
  dd-popover(v-if="visible" trigger="click" placement="bottom-end")
    dd-notification-trigger(
      ghost
      small
      icon="lucide:bell"
      label="Notificações"
      :count="notificationsStore.unreadCount"
      :class="fin.trigger"
    )
    template(#content)
      NotificationCenterDropdown

  template(#fallback)
    dd-button(
      v-if="visible"
      ghost
      small
      icon-only
      disabled
      aria-label="Carregando notificações"
      icon="lucide:bell"
      :class="fin.trigger"
    )
</template>

<style module="fin">
.trigger {
  color: v('color.text.muted');
}
</style>
