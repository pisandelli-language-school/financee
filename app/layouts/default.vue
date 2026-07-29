<script setup lang="ts">
import { AuthCache, AuthModule } from '~/api/auth'
import AppSidebarShell from '~/components/layout/AppSidebarShell.vue'
import AppTopbar from '~/components/layout/AppTopbar.vue'
import type { CurrentAuthPayload } from '~/types/auth'
import { useDashboardStore } from '~~/stores/useDashboardStore'
import { useNotificationsStore } from '~~/stores/useNotificationsStore'
import { useReportsStore } from '~~/stores/useReportsStore'
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
const dashboardStore = useDashboardStore()
const reportsStore = useReportsStore()
const notificationsStore = useNotificationsStore()
const { showToast } = useToaster()

const collapsed = ref(false)
const notificationPollHandle = ref<number | null>(null)
const notificationsReadyForToast = ref(false)
const seenUnreadNotificationIds = ref<Set<string>>(new Set())

const userName = computed(() => user.value?.email?.split('@')[0] ?? 'Perfil')
const menuScopeKey = computed(() => route.path.split('/')[1] || 'home')
const canViewNotifications = computed(() => currentAuth.value?.permissions.includes('notificacoes.view') ?? false)

const deniedCodes = new Set([
  'TEACHER_BLOCKED',
  'UNKNOWN_WORKSPACE_ROLE',
  'INTERNAL_ROLE_REQUIRED',
  'USER_INACTIVE',
  'DIRECTORY_LOOKUP_FAILED',
])

if (user.value && !currentAuth.value) {
  await syncCurrentAuth()
} else if (!user.value) {
  clearCurrentAuthState()
}

watch(user, async () => {
  if (!user.value) {
    clearCurrentAuthState()
    return
  }

  await syncCurrentAuth()
})

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

watch(canViewNotifications, async (value) => {
  if (!import.meta.client) {
    return
  }

  if (!value) {
    resetNotificationPollingState()
    notificationsStore.reset()
    return
  }

  await bootstrapNotifications()
  startNotificationPolling()
}, { immediate: true })

onBeforeUnmount(() => {
  stopNotificationPolling()
})

async function handleSignOut() {
  AuthCache.invalidateAll()
  resetNotificationPollingState()
  preferencesStore.hydrate(null)
  notificationsStore.reset()
  await supabase.auth.signOut()
  currentAuth.value = null
  await navigateTo('/')
}

function clearCurrentAuthState() {
  AuthCache.invalidateAll()
  currentAuth.value = null
  currentAuthLoading.value = false
  resetNotificationPollingState()
  preferencesStore.hydrate(null)
  dashboardStore.hydratePreferences(null)
  reportsStore.hydratePreferences(null)
  notificationsStore.reset()
}

async function syncCurrentAuth() {
  currentAuthLoading.value = true

  try {
    currentAuth.value = await AuthModule.getCurrentUser()
    preferencesStore.hydrate(currentAuth.value.user.preferences)
    dashboardStore.hydratePreferences(currentAuth.value.user.preferences)
    reportsStore.hydratePreferences(currentAuth.value.user.preferences)

    if (!currentAuth.value.permissions.includes('notificacoes.view')) {
      resetNotificationPollingState()
      notificationsStore.reset()
    }
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

function stopNotificationPolling() {
  if (!notificationPollHandle.value) {
    return
  }

  window.clearInterval(notificationPollHandle.value)
  notificationPollHandle.value = null
}

function resetNotificationPollingState() {
  stopNotificationPolling()
  notificationsReadyForToast.value = false
  seenUnreadNotificationIds.value = new Set()
}

function collectUnreadPreviewIds() {
  return notificationsStore.preview
    .filter(notification => !notification.isRead)
    .map(notification => notification.id)
}

function syncSeenUnreadNotifications() {
  seenUnreadNotificationIds.value = new Set([
    ...seenUnreadNotificationIds.value,
    ...collectUnreadPreviewIds(),
  ])
}

function getNotificationToastType(severity: string) {
  if (severity === 'CRITICAL') {
    return 'error'
  }

  if (severity === 'WARNING') {
    return 'warning'
  }

  return 'info'
}

async function refreshNotifications(options?: { bootstrap?: boolean }) {
  await Promise.all([
    notificationsStore.fetchUnreadCount({ force: true }),
    notificationsStore.fetchPreview({ force: true }),
  ])

  if (options?.bootstrap || !notificationsReadyForToast.value) {
    syncSeenUnreadNotifications()
    notificationsReadyForToast.value = true
    return
  }

  for (const notification of notificationsStore.preview) {
    if (
      notification.isRead
      || seenUnreadNotificationIds.value.has(notification.id)
      || (notification.severity !== 'WARNING' && notification.severity !== 'CRITICAL')
    ) {
      continue
    }

    showToast(notification.message, {
      title: notification.title,
      type: getNotificationToastType(notification.severity),
      duration: notification.severity === 'CRITICAL' ? 9000 : 7000,
    })
  }

  syncSeenUnreadNotifications()
}

async function bootstrapNotifications() {
  resetNotificationPollingState()

  try {
    await refreshNotifications({ bootstrap: true })
  } catch {
    resetNotificationPollingState()
  }
}

function startNotificationPolling() {
  stopNotificationPolling()

  notificationPollHandle.value = window.setInterval(() => {
    void refreshNotifications()
  }, 45_000)
}
</script>

<template lang="pug">
dd-layout
  nuxt-loading-indicator(:height="3" color="#0a51cf" :throttle="0")
  AppTopbar(
    :user-name="userName"
    role-label="Administrador"
    :can-view-notifications="canViewNotifications"
    @sign-out="handleSignOut"
  )

  div(data-body)
    AppSidebarShell(
      :items="primaryMenuItems"
      :menu-scope-key="menuScopeKey"
      :collapsed="collapsed"
      :loading="currentAuthLoading"
      :has-user="Boolean(user)"
      @update:collapsed="collapsed = $event"
    )
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
.footer {
  background: v('color.bg.surface');
  border-top: v('border-width.sm') solid v('color.light-gray');
}

.footer a,
.footer span {
  color: v('color.gray');
  font-size: v('font-size.sm');
  text-decoration: none;
}
</style>
