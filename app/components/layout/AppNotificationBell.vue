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
    ClientOnly
      NotificationCenterDropdown

      template(#fallback)
        dd-stack(:class="fin.panelFallback" aria-busy="true")
          dd-skeleton(height="2.5rem" width="100%")
          dd-skeleton(height="5rem" width="100%")
          dd-skeleton(height="2rem" width="9rem")
</template>

<style module="fin">
.trigger {
  color: v('color.text.muted');
}

.panelFallback {
  inline-size: min(26rem, 85vw);
}
</style>
