export type WorkspaceRole = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'STAFF'

export const systemRoleNames = ['Admin', 'Gestor', 'Financeiro', 'Comercial'] as const
export type SystemRoleName = (typeof systemRoleNames)[number]

export const protectedAppModules = [
  'lancamentos',
  'contatos',
  'categorias',
  'contas',
  'centros-custo',
  'tags',
  'formas-pagamento',
  'dias-nao-uteis',
  'contratos',
  'usuarios',
  'permissoes',
  'integracoes',
  'notificacoes',
  'automacoes',
  'relatorios',
  'dashboard',
  'auditoria',
  'jobs',
] as const

export const crudActions = ['view', 'create', 'update', 'delete'] as const

export const specialPermissionKeys = [
  'lancamentos.pay',
  'lancamentos.cancel',
  'contratos.generate',
  'contratos.renew',
  'relatorios.view',
  'relatorios.export',
  'dashboard.view',
  'auditoria.view',
  'jobs.view',
  'jobs.run',
  'automacoes.manage',
  'permissoes.manage',
  'usuarios.manage',
  'integracoes.manage',
] as const

export interface CurrentUserProfile {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  googleWorkspaceRole: WorkspaceRole
  isWorkspaceAdmin: boolean
  internalRoleId: string | null
  internalRoleName: string | null
  isActive: boolean
  preferences: UserPreferencesRecord
}

export interface CurrentAuthPayload {
  user: CurrentUserProfile
  permissions: string[]
}

export interface UserPreferencesRecord {
  sidebarCollapsed: boolean
}

export interface AuthUserRecord extends CurrentUserProfile {
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface AuthRoleRecord {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  usersCount: number
  createdAt: string
  updatedAt: string
}

export interface AuditLogRecord {
  id: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  eventType: string
  entityType: string
  entityId: string
  entityLabel: string | null
  action: string
  userId: string | null
  userEmail: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export interface AuditLogDetailRecord extends AuditLogRecord {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export interface AuthUsersFilters {
  search: string
  page: number
  pageSize: number
}

export interface AuthRolesFilters {
  search: string
  page: number
  pageSize: number
}

export interface UserAccessFormValues {
  internalRoleId: string
  isActive: boolean
}

export interface RolePermissionsFormValues {
  permissionKeys: string[]
}

export interface PermissionCatalogRecord {
  id: string
  key: string
  module: string
  action: string
  description: string | null
}

export interface AuditFilters {
  search: string
  severity: string
  dateFrom: string
  dateTo: string
  page: number
  pageSize: number
}
