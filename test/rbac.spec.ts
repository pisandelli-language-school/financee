import { describe, expect, it } from 'vitest'
import { protectedAppModules, specialPermissionKeys, systemRoleNames } from '~~/app/types/auth'

describe('rbac seed catalog', () => {
  it('includes critical permission keys required by spec 02', () => {
    expect(specialPermissionKeys).toContain('usuarios.manage')
    expect(specialPermissionKeys).toContain('permissoes.manage')
    expect(specialPermissionKeys).toContain('auditoria.view')
    expect(specialPermissionKeys).toContain('dashboard.view')
  })

  it('keeps the base system roles and protected modules available', () => {
    expect(systemRoleNames).toEqual(['Admin', 'Gestor', 'Financeiro', 'Comercial'])
    expect(protectedAppModules).toContain('usuarios')
    expect(protectedAppModules).toContain('permissoes')
  })
})
