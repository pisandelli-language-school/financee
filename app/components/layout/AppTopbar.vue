<script setup lang="ts">
import logoUrl from '~/assets/images/logo-opt.svg?url'
import AppNotificationBell from '~/components/layout/AppNotificationBell.vue'
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
      img(:class="fin.brandLogo" :src="logoUrl" alt="Financee")

      dd-cluster(narrow)
        AppNotificationBell(:visible="canViewNotifications")
        dd-button(
          ghost
          color="var(--dd-color-dark-gray)"
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
  border-bottom: v('border-width.sm') solid v('color.light-gray');
}

.brandLogo {
  block-size: 3rem;
  inline-size: auto;
}
</style>
