<script setup lang="ts">
import logoUrl from '~/assets/images/logo-opt.svg?url'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const {
  primaryMenuItems,
  settingsMenuItems,
  activeMenuKey,
  isInSettings,
} = useBackofficeNavigation()

const collapsed = useState('app:sidebar-collapsed', () => false)
const userName = computed(() => {
  if (!user.value || !('email' in user.value) || !user.value.email) {
    return 'Perfil'
  }

  return user.value.email.split('@')[0] ?? 'Perfil'
})

const userInitials = computed(() => {
  const source = userName.value.split(/[.\s_-]+/).filter(Boolean)

  return source.slice(0, 2).map((chunk) => chunk[0]?.toUpperCase() ?? '').join('') || 'PF'
})

const quickLinks = computed(() => [
  { label: 'Política de dados', to: '#' },
  { label: 'Central de ajuda', to: '#' },
  { label: 'Status do sistema', to: '#' },
])

async function handleSignOut() {
  await supabase.auth.signOut()
  await navigateTo('/')
}

</script>

<template lang="pug">
dd-layout.app-shell
  nuxt-loading-indicator(:height="3" color="#0a51cf" :throttle="0")
  header.app-topbar(data-header)
    dd-cluster.app-topbar__inner(between)
      nuxt-link.app-brand(to="/configuracoes" aria-label="Financee")
        img.app-brand__logo(:src="logoUrl" alt="Financee")

      dd-cluster.app-topbar__actions
        button.app-icon-button(type="button" aria-label="Notificações")
          icon(name="lucide:bell")
        button.app-icon-button(type="button" aria-label="Configurações")
          icon(name="lucide:settings")
        dd-cluster.app-user
          div.app-user__avatar {{ userInitials }}
          dd-stack.app-user__meta(compact nogap)
            strong {{ userName }}
            span Administrador
        button.app-signout(type="button" @click="handleSignOut")
          icon(name="lucide:log-out")
          span Sair

  dd-sidebar.app-body(
    data-body
    data-fill
    nogap
    :class="{ 'app-body--collapsed': collapsed }"
  )
    aside.app-sidebar(:class="{ 'app-sidebar--collapsed': collapsed }")
      dd-stack.app-sidebar__inner
        dd-stack.app-sidebar__menus(compact)
          dd-menu.app-sidebar__menu(
            :items="primaryMenuItems"
            :active-key="activeMenuKey"
            collapsible
            :collapsed="collapsed"
            @update:collapsed="collapsed = $event"
          )
          nav.app-sidebar__subnav(v-if="!collapsed && isInSettings" aria-label="Submenu de configurações")
            nuxt-link(
              v-for="item in settingsMenuItems"
              :key="item.key"
              class="app-sidebar__subnav-link"
              :class="{ 'app-sidebar__subnav-link--active': activeMenuKey === item.key }"
              :to="item.action.type === 'link' ? item.action.to : '/configuracoes'"
            )
              icon.app-sidebar__subnav-icon(v-if="item.icon" :name="item.icon")
              span {{ item.label }}
        button.app-sidebar__toggle(
          type="button"
          :aria-label="collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
          @click="collapsed = !collapsed"
        )
          icon(:name="collapsed ? 'lucide:chevron-right' : 'lucide:chevron-left'")
          span(v-if="!collapsed") {{ collapsed ? 'Expandir' : 'Recolher menu' }}

    dd-box.app-content(tag="main")
      slot

  footer.app-footer(data-footer)
    dd-cluster.app-footer__inner(between)
      dd-cluster.app-footer__links
        a(
          v-for="link in quickLinks"
          :key="link.label"
          :href="link.to"
        ) {{ link.label }}
      span.app-footer__copy Financee © 2026

</template>

<style scoped>
.app-shell {
  background: #f5f7fb;
  color: #151a30;
}

.app-topbar,
.app-footer {
  background: #ffffff;
  border-bottom: 1px solid #e3e4e8;
}

.app-topbar {
  display: flex;
  align-items: center;
  min-block-size: 72px;
}

.app-footer {
  display: flex;
  align-items: center;
  min-block-size: 64px;
  border-bottom: 0;
  border-top: 1px solid #e3e4e8;
}

.app-topbar__inner,
.app-footer__inner {
  inline-size: 100%;
  min-block-size: 100%;
  padding: 0 24px;
  align-items: center;
}

.app-brand {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
}

.app-brand__logo {
  width: auto;
  height: 34px;
}

.app-user strong {
  font-size: 14px;
}

.app-user span,
.app-footer__copy,
.app-footer__links a {
  font-size: 12px;
  color: #73768c;
}

.app-topbar__actions {
  align-items: center;
  gap: 14px;
}

.app-icon-button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: transparent;
  color: #73768c;
  cursor: pointer;
}

.app-icon-button:hover {
  background: #f7f8fc;
  color: #151a30;
}

.app-user {
  min-height: 40px;
  align-items: center;
  gap: 10px;
}

.app-user__meta {
  justify-content: center;
  gap: 2px;
  line-height: 1.15;
}

.app-signout {
  border: 0;
  background: transparent;
  color: #4d5670;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.app-signout:hover {
  color: #0a51cf;
}

.app-user__avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #0a51cf;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.app-body {
  --dd-sidebar-column-size: 240px;
  min-block-size: 0;
  align-items: stretch;
  background: #f5f7fb;
}

.app-body--collapsed {
  --dd-sidebar-column-size: 72px;
}

.app-sidebar {
  width: 240px;
  border-right: 1px solid #e3e4e8;
  background: #ffffff;
  transition: width 0.2s ease;
}

.app-sidebar--collapsed {
  width: 72px;
}

.app-sidebar--collapsed .app-sidebar__inner {
  padding-inline: 8px;
}

.app-sidebar__inner {
  min-block-size: 100%;
  padding: 16px;
  justify-content: space-between;
  gap: 24px;
}

.app-sidebar__menus {
  gap: 8px;
}

.app-sidebar__menu,
.app-sidebar__menu[data-collapsed] {
  --dd-menu-width: 100%;
  --dd-menu-width-collapsed: 100%;
  inline-size: 100%;
}

.app-sidebar__subnav {
  display: grid;
  gap: 4px;
  margin-inline-start: 16px;
  padding-inline-start: 12px;
  border-inline-start: 1px solid #e3e4e8;
}

.app-sidebar__subnav-link {
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #4d5670;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.3;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.app-sidebar__subnav-link:hover {
  background: #f7f8fc;
  color: #151a30;
}

.app-sidebar__subnav-link--active {
  background: rgba(10, 81, 207, 0.08);
  color: #0a51cf;
  font-weight: 600;
}

.app-sidebar__subnav-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.app-sidebar__toggle {
  width: 100%;
  min-height: 40px;
  border: 1px solid #e3e4e8;
  border-radius: 12px;
  background: #ffffff;
  color: #4d5670;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.app-sidebar__toggle:hover {
  border-color: #c7d2e7;
  background: #f7f8fc;
}

.app-content {
  padding: 32px;
  min-width: 0;
}

.app-footer__inner {
  padding-block: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.app-footer__links {
  gap: 16px;
  flex-wrap: wrap;
}

.app-footer__links a {
  text-decoration: none;
}

</style>
