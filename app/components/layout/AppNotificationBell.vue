<script setup lang="ts">
import NotificationCenterDropdown from '~/components/notifications/NotificationCenterDropdown.vue'
import { useNotificationsStore } from '~~/stores/useNotificationsStore'

defineProps<{
  visible: boolean
}>()

const notificationsStore = useNotificationsStore()

const unreadLabel = computed(() => {
  if (notificationsStore.unreadCount > 99) {
    return '99+'
  }

  return String(notificationsStore.unreadCount)
})
</script>

<template lang="pug">
dd-popover(v-if="visible" trigger="click" placement="bottom-end")
  span(:class="fin.wrapper")
    dd-button(
      ghost
      icon-only
      small
      icon="lucide:bell"
      :class="fin.trigger"
      aria-label="Notificações"
    )
    span(
      v-if="notificationsStore.unreadCount > 0"
      :class="[fin.badge, unreadLabel.length > 1 && fin.badgeWide]"
    ) {{ unreadLabel }}
  template(#content)
    NotificationCenterDropdown
</template>

<style module="fin">
.wrapper {
  display: inline-flex;
  position: relative;
}

.trigger {
  color: v('color.dark-gray');
}

.badge {
  align-items: center;
  background: color-mix(in srgb, v('color.danger.500') 78%, white);
  block-size: 1rem;
  border-radius: v('border-radius.full');
  box-shadow: 0 0 0 2px v('color.white');
  color: v('color.white');
  display: inline-flex;
  font-size: 0.6rem;
  font-weight: v('font-weight.bold');
  inset-block-start: -0.15rem;
  inset-inline-end: -0.15rem;
  justify-content: center;
  line-height: 1;
  min-inline-size: 1rem;
  padding-inline: 0;
  position: absolute;
}

.badgeWide {
  min-inline-size: 1.3rem;
  padding-inline: 0.2rem;
}
</style>
