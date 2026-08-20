<script setup lang="ts">
import AppNotificationBell from '~/components/layout/AppNotificationBell.vue'
import AppBrandLogo from '~/components/layout/AppBrandLogo.vue'
import AppUserSummary from '~/components/layout/AppUserSummary.vue'

defineProps<{
  userName: string
  roleLabel?: string
  canViewNotifications: boolean
}>()

defineEmits<{
  (event: 'sign-out'): void
}>()
</script>

<template lang="pug">
header(:class="fin.topbar")
  dd-box
    dd-cluster(between)
      AppBrandLogo(block-size="3rem")

      dd-cluster(narrow :class="fin.actions")
        AppNotificationBell(:visible="canViewNotifications")
        dd-button(
          ghost
          icon-only
          small
          aria-label="Configurações"
          icon="lucide:settings"
          to="/configuracoes"
        )
        AppUserSummary(
          :user-name="userName"
          :role-label="roleLabel"
        )
        dd-button(
          ghost
          small
          icon="lucide:log-out"
          @click="$emit('sign-out')"
        ) Sair
</template>

<style module="fin">
.topbar {
  background: v('color.bg.surface-subtle');
  border-bottom: v('border-width.sm') solid v('color.border.default');
}

.actions {
  align-items: center;
}
</style>
