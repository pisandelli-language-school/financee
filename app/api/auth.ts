import type {
  AuditFilters,
  AuditLogDetailRecord,
  AuditLogRecord,
  AuthRoleRecord,
  AuthRolesFilters,
  AuthUserRecord,
  AuthUsersFilters,
  CurrentAuthPayload,
  PermissionCatalogRecord,
  UserPreferencesRecord,
} from '~/types/auth'
import type { PaginatedResponse } from '~/types/backoffice'

interface AuthRequestOptions {
  method: 'GET' | 'PATCH'
  query?: object
  body?: object
  headers?: Record<string, string | undefined>
}

interface ClientCacheEntry<T> {
  value: T
  loadedAt: number
}

function useAuthRequestOptions() {
  if (!import.meta.server) {
    return {}
  }

  const headers = useRequestHeaders(['cookie'])

  return {
    headers,
  }
}

async function fetchAuth<T>(endpoint: string, options: AuthRequestOptions) {
  const request = $fetch as unknown as (url: string, options: AuthRequestOptions) => Promise<T>
  return await request(endpoint, options)
}

function canUseClientCache() {
  return import.meta.client
}

function getCurrentUserCache() {
  return useState<ClientCacheEntry<CurrentAuthPayload> | null>('auth:current-user-cache', () => null)
}

function getRolesCache() {
  return useState<Record<string, ClientCacheEntry<PaginatedResponse<AuthRoleRecord>>>>('auth:roles-cache', () => ({}))
}

function getPermissionsCache() {
  return useState<ClientCacheEntry<PermissionCatalogRecord[]> | null>('auth:permissions-cache', () => null)
}

function getListCacheKey(filters: object) {
  return JSON.stringify(filters)
}

function setRolesCacheEntry(filters: AuthRolesFilters, value: PaginatedResponse<AuthRoleRecord>) {
  if (!canUseClientCache()) {
    return
  }

  const rolesCache = getRolesCache()
  rolesCache.value = {
    ...rolesCache.value,
    [getListCacheKey(filters)]: {
      value,
      loadedAt: Date.now(),
    },
  }
}

function getRolesCacheEntry(filters: AuthRolesFilters) {
  if (!canUseClientCache()) {
    return null
  }

  const rolesCache = getRolesCache()
  return rolesCache.value[getListCacheKey(filters)] ?? null
}

function invalidateCurrentUserCache() {
  if (!canUseClientCache()) {
    return
  }

  getCurrentUserCache().value = null
}

function invalidateRolesCache() {
  if (!canUseClientCache()) {
    return
  }

  getRolesCache().value = {}
}

function invalidatePermissionsCache() {
  if (!canUseClientCache()) {
    return
  }

  getPermissionsCache().value = null
}

function patchCurrentUserCache(nextUser: CurrentAuthPayload['user']) {
  if (!canUseClientCache()) {
    return
  }

  const currentUserCache = getCurrentUserCache()

  if (!currentUserCache.value) {
    return
  }

  currentUserCache.value = {
    ...currentUserCache.value,
    value: {
      ...currentUserCache.value.value,
      user: nextUser,
    },
  }
}

export const AuthCache = {
  invalidateCurrentUser: invalidateCurrentUserCache,
  invalidateRoles: invalidateRolesCache,
  invalidatePermissions: invalidatePermissionsCache,
  invalidateReferenceData() {
    invalidateRolesCache()
    invalidatePermissionsCache()
  },
  invalidateAll() {
    invalidateCurrentUserCache()
    invalidateRolesCache()
    invalidatePermissionsCache()
  },
  patchCurrentUser(nextUser: CurrentAuthPayload['user']) {
    patchCurrentUserCache(nextUser)
  },
}

export const AuthModule = {
  async getCurrentUser(options?: { force?: boolean }) {
    if (canUseClientCache() && !options?.force) {
      const cached = getCurrentUserCache().value

      if (cached) {
        return cached.value
      }
    }

    const requestOptions = useAuthRequestOptions()
    const response = await fetchAuth<CurrentAuthPayload>('/api/auth/me', {
      method: 'GET',
      ...requestOptions,
    })

    if (canUseClientCache()) {
      getCurrentUserCache().value = {
        value: response,
        loadedAt: Date.now(),
      }
    }

    return response
  },
}

export const AuthPreferencesModule = {
  async update(payload: UserPreferencesRecord) {
    const requestOptions = useAuthRequestOptions()
    const response = await fetchAuth<UserPreferencesRecord>('/api/auth/preferences', {
      method: 'PATCH',
      body: payload,
      ...requestOptions,
    })

    if (canUseClientCache()) {
      const currentUser = useState<CurrentAuthPayload | null>('auth:current-user', () => null)

      if (currentUser.value) {
        const nextUser = {
          ...currentUser.value.user,
          preferences: response,
        }

        currentUser.value = {
          ...currentUser.value,
          user: nextUser,
        }

        patchCurrentUserCache(nextUser)
      }
    }

    return response
  },
}

export const AuthUsersModule = {
  async list(filters: AuthUsersFilters) {
    const requestOptions = useAuthRequestOptions()

    return await fetchAuth<PaginatedResponse<AuthUserRecord>>('/api/auth/users', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async update(id: string, payload: { internalRoleId: string | null; isActive: boolean }) {
    const requestOptions = useAuthRequestOptions()
    const response = await fetchAuth<AuthUserRecord>(`/api/auth/users/${id}`, {
      method: 'PATCH',
      body: payload,
      ...requestOptions,
    })

    invalidateCurrentUserCache()
    invalidateRolesCache()

    return response
  },
}

export const AuthRolesModule = {
  async list(filters: AuthRolesFilters) {
    const cached = getRolesCacheEntry(filters)

    if (cached) {
      return cached.value
    }

    const requestOptions = useAuthRequestOptions()
    const response = await fetchAuth<PaginatedResponse<AuthRoleRecord>>('/api/auth/roles', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })

    setRolesCacheEntry(filters, response)

    return response
  },
  async updatePermissions(id: string, permissionKeys: string[]) {
    const requestOptions = useAuthRequestOptions()
    const response = await fetchAuth<AuthRoleRecord>(`/api/auth/roles/${id}/permissions`, {
      method: 'PATCH',
      body: { permissionKeys },
      ...requestOptions,
    })

    invalidateCurrentUserCache()
    invalidateRolesCache()

    return response
  },
}

export const AuthPermissionsModule = {
  async list(options?: { force?: boolean }) {
    if (canUseClientCache() && !options?.force) {
      const cached = getPermissionsCache().value

      if (cached) {
        return cached.value
      }
    }

    const requestOptions = useAuthRequestOptions()
    const response = await fetchAuth<PermissionCatalogRecord[]>('/api/auth/permissions', {
      method: 'GET',
      ...requestOptions,
    })

    if (canUseClientCache()) {
      getPermissionsCache().value = {
        value: response,
        loadedAt: Date.now(),
      }
    }

    return response
  },
}

export const AuditModule = {
  async list(filters: AuditFilters) {
    const requestOptions = useAuthRequestOptions()

    return await fetchAuth<PaginatedResponse<AuditLogRecord>>('/api/auth/audit', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async getById(id: string) {
    const requestOptions = useAuthRequestOptions()

    return await fetchAuth<AuditLogDetailRecord>(`/api/auth/audit/${id}`, {
      method: 'GET',
      ...requestOptions,
    })
  },
}
