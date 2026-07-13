import { serverSupabaseUser } from '#supabase/server'
import type { Permission, Role, RolePermission, User as PrismaUser } from '@prisma/client'
import type { H3Event } from 'h3'
import type { CurrentAuthPayload, WorkspaceRole } from '~~/app/types/auth'
import { evaluateWorkspaceAccess, resolveWorkspaceIdentity } from '~~/server/utils/auth-workspace'
import { getGoogleWorkspaceUser } from '~~/server/utils/google'
import { prisma } from '~~/server/utils/prisma'
import { ensureRbacSeeded } from '~~/server/utils/rbac'

interface AuthenticatedSessionUser {
  id: string
  email: string
}

type UserUpdateData = Parameters<typeof prisma.user.update>[0]['data']

type UserWithPermissions = PrismaUser & {
  internalRole: (Role & {
    permissions: Array<RolePermission & {
      permission: Permission
    }>
  }) | null
}

const authInclude = {
  internalRole: {
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  },
} satisfies Parameters<typeof prisma.user.findUnique>[0]['include']

const globalForAuth = globalThis as typeof globalThis & {
  __financeeUserSyncPromises?: Map<string, Promise<UserWithPermissions>>
}

function getUserSyncPromises() {
  if (!globalForAuth.__financeeUserSyncPromises) {
    globalForAuth.__financeeUserSyncPromises = new Map<string, Promise<UserWithPermissions>>()
  }

  return globalForAuth.__financeeUserSyncPromises
}

export function hasPermission(permissions: string[], permissionKey: string) {
  return permissions.includes(permissionKey)
}

function accessDenied(message: string, code: string): never {
  throw createError({
    statusCode: 403,
    message,
    data: { code },
  })
}

function extractPermissions(user: UserWithPermissions) {
  return user.internalRole?.permissions.map(entry => entry.permission.key) ?? []
}

function toCurrentAuthPayload(user: UserWithPermissions): CurrentAuthPayload {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      googleWorkspaceRole: (user.googleWorkspaceRole as WorkspaceRole | null) ?? 'STAFF',
      isWorkspaceAdmin: user.isWorkspaceAdmin,
      internalRoleId: user.internalRoleId,
      internalRoleName: user.internalRole?.name ?? null,
      isActive: user.isActive,
    },
    permissions: extractPermissions(user),
  }
}

async function upsertFinanceeUser(sessionUser: AuthenticatedSessionUser) {
  await ensureRbacSeeded()

  const googleUser = await getGoogleWorkspaceUser(sessionUser.email)
  const identity = resolveWorkspaceIdentity(googleUser)
  const access = evaluateWorkspaceAccess(identity)

  if (!access.allowed) {
    if (access.reason === 'TEACHER_BLOCKED') {
      accessDenied('Professores não possuem acesso ao Financee.', access.reason)
    }

    accessDenied(
      'Usuário autenticado sem papel reconhecido para acesso ao Financee.',
      access.reason,
    )
  }

  const rootUserEmail = process.env.ROOT_USER_EMAIL?.trim().toLowerCase()
  const shouldBootstrapAdmin =
    Boolean(rootUserEmail)
    && identity.email.toLowerCase() === rootUserEmail
    && identity.isWorkspaceAdmin

  const adminRole = shouldBootstrapAdmin
    ? await prisma.role.findUnique({
        where: { name: 'Admin' },
        select: { id: true },
      })
    : null

  return await synchronizeFinanceeUser(identity.email, async () => {
    const existing = await prisma.user.findUnique({
      where: { email: identity.email },
      include: authInclude,
    })

    if (!existing) {
      return await prisma.user.create({
        data: {
          email: identity.email,
          name: identity.name,
          avatarUrl: identity.avatarUrl,
          googleWorkspaceRole: identity.googleWorkspaceRole,
          isWorkspaceAdmin: identity.isWorkspaceAdmin,
          isActive: true,
          ...(adminRole ? { internalRoleId: adminRole.id } : {}),
        },
        include: authInclude,
      })
    }

    const updateData = buildUserSyncUpdateData(existing, {
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      googleWorkspaceRole: identity.googleWorkspaceRole,
      isWorkspaceAdmin: identity.isWorkspaceAdmin,
      adminRoleId: adminRole?.id ?? null,
      shouldBootstrapAdmin,
    })

    if (!Object.keys(updateData).length) {
      return existing
    }

    return await prisma.user.update({
      where: { id: existing.id },
      data: updateData,
      include: authInclude,
    })
  })
}

export async function requireSupabaseUser(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user || !('email' in user) || !user.email) {
    throw createError({
      statusCode: 401,
      message: 'Não autorizado.',
    })
  }

  return {
    id: user.id,
    email: user.email,
  } satisfies AuthenticatedSessionUser
}

export async function resolveAuthenticatedFinanceeUser(event: H3Event) {
  const sessionUser = await requireSupabaseUser(event)

  let user: UserWithPermissions

  try {
    user = await upsertFinanceeUser(sessionUser)
  } catch (error) {
    if (isErrorWithStatusCode(error)) {
      throw error
    }

    throw createError({
      statusCode: 403,
      message: 'Não foi possível validar o usuário no Google Workspace.',
      data: {
        code: 'DIRECTORY_LOOKUP_FAILED',
      },
      cause: error,
    })
  }

  if (user.deletedAt || !user.isActive) {
    accessDenied('O usuário está inativo no Financee.', 'USER_INACTIVE')
  }

  if (!user.internalRoleId || !user.internalRole) {
    accessDenied('Usuário autenticado sem papel interno atribuído.', 'INTERNAL_ROLE_REQUIRED')
  }

  return {
    sessionUser,
    user,
    current: toCurrentAuthPayload(user),
  }
}

export async function requireFinanceeUser(event: H3Event) {
  return await resolveAuthenticatedFinanceeUser(event)
}

export async function requirePermission(event: H3Event, permissionKey: string) {
  const resolved = await requireFinanceeUser(event)

  if (!hasPermission(resolved.current.permissions, permissionKey)) {
    accessDenied(
      'O usuário autenticado não possui permissão suficiente para esta operação.',
      'MISSING_PERMISSION',
    )
  }

  return resolved
}

function isErrorWithStatusCode(error: unknown): error is { statusCode: number } {
  return Boolean(
    error
    && typeof error === 'object'
    && 'statusCode' in error
    && typeof error.statusCode === 'number',
  )
}

function buildUserSyncUpdateData(
  existing: UserWithPermissions,
  input: {
    name: string
    avatarUrl: string | null
    googleWorkspaceRole: string
    isWorkspaceAdmin: boolean
    adminRoleId: string | null
    shouldBootstrapAdmin: boolean
  },
) {
  const updateData: UserUpdateData = {}

  if (existing.name !== input.name) {
    updateData.name = input.name
  }

  if ((existing.avatarUrl ?? null) !== input.avatarUrl) {
    updateData.avatarUrl = input.avatarUrl
  }

  if ((existing.googleWorkspaceRole ?? 'STAFF') !== input.googleWorkspaceRole) {
    updateData.googleWorkspaceRole = input.googleWorkspaceRole
  }

  if (existing.isWorkspaceAdmin !== input.isWorkspaceAdmin) {
    updateData.isWorkspaceAdmin = input.isWorkspaceAdmin
  }

  if (
    input.shouldBootstrapAdmin
    && input.adminRoleId
    && !existing.internalRoleId
  ) {
    updateData.internalRoleId = input.adminRoleId
  }

  return updateData
}

async function synchronizeFinanceeUser(email: string, task: () => Promise<UserWithPermissions>) {
  const syncPromises = getUserSyncPromises()
  const normalizedEmail = email.toLowerCase()
  const pending = syncPromises.get(normalizedEmail)

  if (pending) {
    return await pending
  }

  const promise = task().finally(() => {
    syncPromises.delete(normalizedEmail)
  })

  syncPromises.set(normalizedEmail, promise)
  return await promise
}
