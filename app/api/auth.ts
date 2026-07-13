import type {
  AuditFilters,
  AuditLogRecord,
  AuthRoleRecord,
  AuthRolesFilters,
  AuthUserRecord,
  AuthUsersFilters,
  CurrentAuthPayload,
  PermissionCatalogRecord,
} from '~/types/auth'
import type { PaginatedResponse } from '~/types/backoffice'

interface AuthRequestOptions {
  method: 'GET' | 'PATCH'
  query?: object
  body?: Record<string, unknown>
  headers?: Record<string, string | undefined>
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

export const AuthModule = {
  async getCurrentUser() {
    const requestOptions = useAuthRequestOptions()

    return await fetchAuth<CurrentAuthPayload>('/api/auth/me', {
      method: 'GET',
      ...requestOptions,
    })
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

    return await fetchAuth<AuthUserRecord>(`/api/auth/users/${id}`, {
      method: 'PATCH',
      body: payload,
      ...requestOptions,
    })
  },
}

export const AuthRolesModule = {
  async list(filters: AuthRolesFilters) {
    const requestOptions = useAuthRequestOptions()

    return await fetchAuth<PaginatedResponse<AuthRoleRecord>>('/api/auth/roles', {
      method: 'GET',
      query: filters,
      ...requestOptions,
    })
  },
  async updatePermissions(id: string, permissionKeys: string[]) {
    const requestOptions = useAuthRequestOptions()

    return await fetchAuth<AuthRoleRecord>(`/api/auth/roles/${id}/permissions`, {
      method: 'PATCH',
      body: { permissionKeys },
      ...requestOptions,
    })
  },
}

export const AuthPermissionsModule = {
  async list() {
    const requestOptions = useAuthRequestOptions()

    return await fetchAuth<PermissionCatalogRecord[]>('/api/auth/permissions', {
      method: 'GET',
      ...requestOptions,
    })
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
}
