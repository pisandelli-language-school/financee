import type { WorkspaceRole } from '~~/app/types/auth'

export interface GoogleDirectoryUser {
  primaryEmail?: string | null
  isAdmin?: boolean | null
  thumbnailPhotoUrl?: string | null
  name?: {
    fullName?: string | null
  } | null
  customSchemas?: {
    Custom_Fields?: Record<string, unknown>
  } | null
}

export interface WorkspaceIdentity {
  email: string
  name: string
  avatarUrl: string | null
  googleWorkspaceRole: WorkspaceRole
  isWorkspaceAdmin: boolean
  isManager: boolean
  isTeacher: boolean
}

export interface WorkspaceAccessDecision {
  allowed: boolean
  reason: 'ALLOWED' | 'TEACHER_BLOCKED' | 'UNKNOWN_WORKSPACE_ROLE'
}

export function getBooleanLike(value: unknown) {
  return value === true || value === 'true'
}

export function resolveWorkspaceIdentity(googleUser: GoogleDirectoryUser): WorkspaceIdentity {
  const customFields = (googleUser.customSchemas?.Custom_Fields ?? {}) as Record<string, unknown>
  const isWorkspaceAdmin = Boolean(googleUser.isAdmin)
  const isManager = getBooleanLike(customFields.manager)
  const isTeacher = getBooleanLike(customFields.teacher)

  let googleWorkspaceRole: WorkspaceRole = 'STAFF'

  if (isWorkspaceAdmin) {
    googleWorkspaceRole = 'ADMIN'
  } else if (isManager) {
    googleWorkspaceRole = 'MANAGER'
  } else if (isTeacher) {
    googleWorkspaceRole = 'TEACHER'
  }

  return {
    email: googleUser.primaryEmail ?? '',
    name: googleUser.name?.fullName ?? googleUser.primaryEmail ?? 'Usuário sem nome',
    avatarUrl: googleUser.thumbnailPhotoUrl ?? null,
    googleWorkspaceRole,
    isWorkspaceAdmin,
    isManager,
    isTeacher,
  }
}

export function evaluateWorkspaceAccess(identity: WorkspaceIdentity): WorkspaceAccessDecision {
  if (identity.isTeacher) {
    return {
      allowed: false,
      reason: 'TEACHER_BLOCKED',
    }
  }

  if (identity.googleWorkspaceRole === 'STAFF') {
    return {
      allowed: false,
      reason: 'UNKNOWN_WORKSPACE_ROLE',
    }
  }

  return {
    allowed: true,
    reason: 'ALLOWED',
  }
}
