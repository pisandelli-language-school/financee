<script setup lang="ts">
import AppNotificationBell from '~/components/layout/AppNotificationBell.vue'
import AppBrandLogo from '~/components/layout/AppBrandLogo.vue'
import AppUserSummary from '~/components/layout/AppUserSummary.vue'

defineProps<{
  userName: string
  avatarUrl?: string | null
  roleLabel?: string
  canViewNotifications: boolean
  isDarkerTheme: boolean
}>()

defineEmits<{
  (event: 'sign-out'): void
  (event: 'update:is-darker-theme', value: boolean): void
}>()
</script>

<template lang="pug">
header(:class="fin.topbar")
  dd-box
    dd-cluster(between)
      AppBrandLogo(block-size="3rem")

      dd-cluster(narrow :class="fin.actions")
        AppNotificationBell(:visible="canViewNotifications")
        AppUserSummary(
          :user-name="userName"
          :avatar-url="avatarUrl"
          :role-label="roleLabel"
        )
        dd-popover(trigger="click" placement="bottom-end")
          dd-button(
            ghost
            icon-only
            small
            aria-label="Abrir menu do perfil"
            icon="lucide:ellipsis-vertical"
          )

          template(#content)
            dd-stack(compact :class="fin.profileMenu")
              dd-button(
                ghost
                small
                icon="lucide:settings"
                to="/configuracoes"
              ) Configurações
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

.profileMenu {
  min-inline-size: 12rem;
}

</style>
