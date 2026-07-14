<script setup lang="ts">
import logoUrl from '~/assets/images/logo-opt.svg?url'
import { AuthCache, AuthModule } from '~/api/auth'
import type { CurrentAuthPayload } from '~/types/auth'
import { useUserPreferencesStore } from '~~/stores/useUserPreferencesStore'

const quickLinks = [
  { label: 'Política de dados', to: '#' },
  { label: 'Central de ajuda', to: '#' },
  { label: 'Status do sistema', to: '#' },
]

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()
const currentAuth = useState<CurrentAuthPayload | null>('auth:current-user', () => null)
const currentAuthLoading = useState('auth:current-user-loading', () => false)
const {
  primaryMenuItems,
} = useBackofficeNavigation()
const preferencesStore = useUserPreferencesStore()

const collapsed = ref(false)
const menuRef = ref<{
  collapse: () => void
  expand: () => void
  toggle: () => void
} | null>(null)

const userName = computed(() => user.value?.email?.split('@')[0] ?? 'Perfil')

const deniedCodes = new Set([
  'TEACHER_BLOCKED',
  'UNKNOWN_WORKSPACE_ROLE',
  'INTERNAL_ROLE_REQUIRED',
  'USER_INACTIVE',
  'DIRECTORY_LOOKUP_FAILED',
])

watch(user, async () => {
  if (!user.value) {
    AuthCache.invalidateAll()
    currentAuth.value = null
    currentAuthLoading.value = false
    preferencesStore.hydrate(null)
    return
  }

  currentAuthLoading.value = true

  try {
    currentAuth.value = await AuthModule.getCurrentUser()
    preferencesStore.hydrate(currentAuth.value.user.preferences)
  } catch (error) {
    currentAuth.value = null

    const statusCode = getStatusCode(error)
    const errorCode = getErrorCode(error)

    if (statusCode === 401) {
      await supabase.auth.signOut()

      if (route.path !== '/login') {
        await navigateTo('/login')
      }

      return
    }

    if (statusCode === 403 && errorCode && deniedCodes.has(errorCode)) {
      if (route.path !== '/acesso-negado') {
        await navigateTo('/acesso-negado')
      }
    }
  } finally {
    currentAuthLoading.value = false
  }
}, { immediate: true })

watch(() => preferencesStore.preferences.sidebarCollapsed, (value) => {
  if (collapsed.value !== value) {
    collapsed.value = value
  }
}, { immediate: true })

watch(collapsed, async (value) => {
  if (!preferencesStore.hydrated || value === preferencesStore.preferences.sidebarCollapsed) {
    return
  }

  try {
    await preferencesStore.updatePreferences({
      sidebarCollapsed: value,
    })
  } catch {
    collapsed.value = preferencesStore.preferences.sidebarCollapsed
  }
})

async function handleSignOut() {
  AuthCache.invalidateAll()
  preferencesStore.hydrate(null)
  await supabase.auth.signOut()
  currentAuth.value = null
  await navigateTo('/')
}

function toggleSidebar() {
  if (menuRef.value) {
    menuRef.value.toggle()
    return
  }

  collapsed.value = !collapsed.value
}

function getStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status
  }

  return null
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return ''
  }

  const data = error.data

  if (!data || typeof data !== 'object' || !('code' in data) || typeof data.code !== 'string') {
    return ''
  }

  return data.code
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
          dd-stack(compact)
            dd-menu(
              ref="menuRef"
              :class="fin.menu"
              :items="primaryMenuItems"
              collapsible
              :collapsed="collapsed"
              @update:collapsed="collapsed = $event"
            )
            dd-stack(
              v-if="currentAuthLoading && user"
              compact
              :class="fin.menuSkeleton"
            )
              dd-cluster(v-for="item in 3" :key="item" compact :class="fin.menuSkeletonRow")
                dd-skeleton(
                  v-if="collapsed"
                  circle
                  width="1.5rem"
                  height="1.5rem"
                )
                template(v-else)
                  dd-skeleton(circle width="1.5rem" height="1.5rem")
                  dd-skeleton(height="1rem" width="8rem" radius="999px")
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

.menuSkeleton {
  padding-block-start: v('space.xs');
}

.menuSkeletonRow {
  align-items: center;
  min-block-size: 2rem;
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
