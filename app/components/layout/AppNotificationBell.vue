<script setup lang="ts">
import NotificationCenterDropdown from '~/components/notifications/NotificationCenterDropdown.vue'
import { useNotificationsStore } from '~~/stores/useNotificationsStore'

defineProps<{
  visible: boolean
}>()

const notificationsStore = useNotificationsStore()
</script>

<template lang="pug">
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
</template>

<style module="fin">
.trigger {
  color: v('color.dark-gray');
}
</style>
