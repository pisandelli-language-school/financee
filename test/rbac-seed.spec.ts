import { describe, expect, it } from 'vitest'
import {
  buildCrudPermissionKeys,
  buildPermissionCatalog,
  getSystemRolePermissions,
} from '~~/server/utils/rbac-catalog'

describe('rbac seed helpers', () => {
  it('builds the CRUD permission catalog for key finance modules', () => {
    const crudKeys = buildCrudPermissionKeys()

    expect(crudKeys).toContain('lancamentos.view')
    expect(crudKeys).toContain('usuarios.delete')
    expect(crudKeys).toContain('permissoes.update')
  })

  it('includes special permission keys in the full catalog', () => {
    const permissionKeys = buildPermissionCatalog()

    expect(permissionKeys).toContain('dashboard.view')
    expect(permissionKeys).toContain('usuarios.manage')
    expect(permissionKeys).toContain('auditoria.view')
  })

  it('grants all permissions to Admin', () => {
    const permissionKeys = buildPermissionCatalog()
    const adminPermissions = getSystemRolePermissions('Admin')

    expect(adminPermissions).toEqual(permissionKeys)
  })

  it('keeps Financeiro without admin-only permission keys', () => {
    const financeiroPermissions = getSystemRolePermissions('Financeiro')

    expect(financeiroPermissions).toContain('lancamentos.pay')
    expect(financeiroPermissions).toContain('relatorios.export')
    expect(financeiroPermissions).not.toContain('usuarios.manage')
    expect(financeiroPermissions).not.toContain('permissoes.manage')
  })
})
