<script setup lang="ts">
import logoUrl from '~/assets/images/logo-opt.svg?url'

const quickLinks = [
  { label: 'Política de dados', to: '#' },
  { label: 'Central de ajuda', to: '#' },
  { label: 'Status do sistema', to: '#' },
]

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const {
  primaryMenuItems,
} = useBackofficeNavigation()

const collapsed = useState('app:sidebar-collapsed', () => false)
const menuRef = ref<{
  collapse: () => void
  expand: () => void
  toggle: () => void
} | null>(null)

const userName = computed(() => user.value?.email?.split('@')[0] ?? 'Perfil')

async function handleSignOut() {
  await supabase.auth.signOut()
  await navigateTo('/')
}

function toggleSidebar() {
  if (menuRef.value) {
    menuRef.value.toggle()
    return
  }

  collapsed.value = !collapsed.value
}
</script>

<template lang="pug">
dd-layout
  nuxt-loading-indicator(:height="3" color="#0a51cf" :throttle="0")
  header(:class="fin.topbar")
    dd-box
      dd-cluster(between)
        img(:class="fin.brandLogo" :src="logoUrl" alt="Financee")

        dd-cluster(narrow)
          dd-button(
            ghost
            color="var(--dd-color-dark-gray)"
            icon-only
            small
            aria-label="Notificações"
            icon="lucide:bell"
          )
          dd-button(
            ghost
            color="var(--dd-color-dark-gray)"
            icon-only
            small
            aria-label="Configurações"
            icon="lucide:settings"
            to="/configuracoes"
          )
          dd-cluster(:class='fin.avatar')
            dd-avatar(:alt='userName' small)
            dd-stack(nogap :class="fin.userMeta")
              strong {{ userName }}
              span Administrador
          dd-button(
            ghost
            small
            icon="lucide:log-out"
            @click="handleSignOut"
          ) Sair

  div(data-body)
    dd-sidebar(fill :class="[fin.sidebarLayout, collapsed && fin.bodyCollapsed]")
      aside(:class='fin.aside')
        dd-stack(split-after="1" :class="fin.sidebarFlow")
          dd-menu(
            ref="menuRef"
            :class="fin.menu"
            :items="primaryMenuItems"
            collapsible
            :collapsed="collapsed"
            @update:collapsed="collapsed = $event"
          )
          dd-center
            dd-button(
              ghost
              small
              :icon="collapsed ? 'lucide:panel-left-open' : 'lucide:panel-right-open'"
              @click="toggleSidebar"
            )
              span(v-if="!collapsed") Recolher menu
      dd-box(tag="main" :class="fin.content")
        slot

  footer(:class="fin.footer")
    dd-box
      dd-cluster(between)
        dd-cluster
          a(
            v-for="link in quickLinks"
            :key="link.label"
            :href="link.to"
          ) {{ link.label }}
        span Financee © 2026
</template>

<style module="fin">
.topbar {
  border-bottom: v('border-width.sm') solid v('color.light-gray');
}

.brandLogo {
  block-size: 3rem;
  inline-size: auto;
}

.avatar {
  --dd-cluster-gap: v('space.xxs');
}

.userMeta {
  font-size: v('font-size.sm');
  text-transform: capitalize;
  span {
    font-size: v('font-size.xs') 
  }
}

.footer {
  background: v('color.bg.surface');
  border-top: v('border-width.sm') solid v('color.light-gray');
  * {
    color: v('color.gray');
    font-size: v('font-size.sm');
    text-decoration: none;
  }
}

.sidebarLayout {
  --dd-sidebar-column-size: 15rem;
}

.bodyCollapsed {
  --dd-center-gap: 0;
  --dd-sidebar-column-size: 4.5rem;
}

.aside {
  background: v('color.bg.surface');
  border-right: v('border-width.sm') solid v('color.light-gray');
  min-block-size: 100%;
  padding: v('space.sm');
  transition: padding v('transition.slow');
}

.sidebarLayout > :first-child {
  min-inline-size: 0;
  transition: flex-basis v('transition.slow');
}

.sidebarFlow {
  min-block-size: 100%;
}

.menu {
  --dd-menu-submenu-padding-inline-start: v('space.xs');
}

/* TODO: Remove when Daredash restores submenu spacing by default. */
.menu > ul > li[data-has-children] {
  display: grid;
  gap: v('space.xxs');
}

.menu {
  --dd-menu-width: 100%;
  --dd-menu-width-collapsed: 100%;
  inline-size: 100%;
}

.content {
  --dd-box-gap: v('space.xxl');
  min-width: 0;
}
</style>
