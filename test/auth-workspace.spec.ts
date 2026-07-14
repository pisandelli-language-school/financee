import { describe, expect, it } from 'vitest'
import {
  evaluateWorkspaceAccess,
  getBooleanLike,
  resolveWorkspaceIdentity,
} from '~~/server/utils/auth-workspace'

describe('workspace identity mapping', () => {
  it('accepts boolean-like custom field values', () => {
    expect(getBooleanLike(true)).toBe(true)
    expect(getBooleanLike('true')).toBe(true)
    expect(getBooleanLike(false)).toBe(false)
    expect(getBooleanLike('false')).toBe(false)
    expect(getBooleanLike(undefined)).toBe(false)
  })

  it('prioritizes admin over manager and teacher flags', () => {
    const identity = resolveWorkspaceIdentity({
      primaryEmail: 'admin@empresa.com',
      isAdmin: true,
      customSchemas: {
        Custom_Fields: {
          manager: 'true',
          teacher: 'true',
        },
      },
    })

    expect(identity.googleWorkspaceRole).toBe('ADMIN')
    expect(identity.isWorkspaceAdmin).toBe(true)
    expect(identity.isManager).toBe(true)
    expect(identity.isTeacher).toBe(true)
  })

  it('maps manager when custom field is set and user is not admin', () => {
    const identity = resolveWorkspaceIdentity({
      primaryEmail: 'gestor@empresa.com',
      customSchemas: {
        Custom_Fields: {
          manager: true,
        },
      },
    })

    expect(identity.googleWorkspaceRole).toBe('MANAGER')
  })

  it('blocks teachers from Financee access', () => {
    const decision = evaluateWorkspaceAccess(resolveWorkspaceIdentity({
      primaryEmail: 'teacher@empresa.com',
      customSchemas: {
        Custom_Fields: {
          teacher: true,
        },
      },
    }))

    expect(decision).toEqual({
      allowed: false,
      reason: 'TEACHER_BLOCKED',
    })
  })

  it('blocks unknown workspace users by default', () => {
    const decision = evaluateWorkspaceAccess(resolveWorkspaceIdentity({
      primaryEmail: 'staff@empresa.com',
    }))

    expect(decision).toEqual({
      allowed: false,
      reason: 'UNKNOWN_WORKSPACE_ROLE',
    })
  })

  it('allows admin and manager identities', () => {
    const adminDecision = evaluateWorkspaceAccess(resolveWorkspaceIdentity({
      primaryEmail: 'admin@empresa.com',
      isAdmin: true,
    }))

    const managerDecision = evaluateWorkspaceAccess(resolveWorkspaceIdentity({
      primaryEmail: 'gestor@empresa.com',
      customSchemas: {
        Custom_Fields: {
          manager: 'true',
        },
      },
    }))

    expect(adminDecision).toEqual({
      allowed: true,
      reason: 'ALLOWED',
    })
    expect(managerDecision).toEqual({
      allowed: true,
      reason: 'ALLOWED',
    })
  })
})
