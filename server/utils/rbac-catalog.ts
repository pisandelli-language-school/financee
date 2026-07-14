import { crudActions, specialPermissionKeys } from '~~/app/types/auth'
import type { SystemRoleName } from '~~/app/types/auth'

export const crudModules = [
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
] as const

export function buildCrudPermissionKeys() {
  return crudModules.flatMap(moduleName =>
    crudActions.map(action => `${moduleName}.${action}`),
  )
}

export function buildPermissionCatalog() {
  return [
    ...buildCrudPermissionKeys(),
    ...specialPermissionKeys,
  ]
}

export function getSystemRoleDescription(roleName: SystemRoleName) {
  const descriptionMap: Record<SystemRoleName, string> = {
    Admin: 'Acesso completo ao sistema.',
    Gestor: 'Acesso gerencial com dashboards, relatórios e auditoria.',
    Financeiro: 'Acesso operacional ao financeiro.',
    Comercial: 'Acesso comercial e contratos.',
  }

  return descriptionMap[roleName]
}

export function getSystemRolePermissions(roleName: SystemRoleName) {
  const allPermissions = buildPermissionCatalog()

  if (roleName === 'Admin') {
    return allPermissions
  }

  const roleMap: Record<SystemRoleName, string[]> = {
    Admin: allPermissions,
    Gestor: [
      'lancamentos.view',
      'contratos.view',
      'contatos.view',
      'categorias.view',
      'contas.view',
      'centros-custo.view',
      'tags.view',
      'formas-pagamento.view',
      'dias-nao-uteis.view',
      'dashboard.view',
      'relatorios.view',
      'relatorios.export',
      'notificacoes.view',
      'automacoes.manage',
      'jobs.view',
      'auditoria.view',
    ],
    Financeiro: [
      'lancamentos.view',
      'lancamentos.create',
      'lancamentos.update',
      'lancamentos.delete',
      'lancamentos.pay',
      'lancamentos.cancel',
      'contratos.view',
      'contratos.generate',
      'contatos.view',
      'contatos.create',
      'contatos.update',
      'contatos.delete',
      'categorias.view',
      'categorias.create',
      'categorias.update',
      'categorias.delete',
      'contas.view',
      'contas.create',
      'contas.update',
      'contas.delete',
      'centros-custo.view',
      'centros-custo.create',
      'centros-custo.update',
      'centros-custo.delete',
      'tags.view',
      'tags.create',
      'tags.update',
      'tags.delete',
      'formas-pagamento.view',
      'formas-pagamento.create',
      'formas-pagamento.update',
      'formas-pagamento.delete',
      'dias-nao-uteis.view',
      'dias-nao-uteis.create',
      'dias-nao-uteis.update',
      'dias-nao-uteis.delete',
      'dashboard.view',
      'relatorios.view',
      'relatorios.export',
      'notificacoes.view',
    ],
    Comercial: [
      'lancamentos.view',
      'contratos.view',
      'contratos.create',
      'contratos.update',
      'contratos.delete',
      'contratos.generate',
      'contratos.renew',
      'contatos.view',
      'contatos.create',
      'contatos.update',
      'contatos.delete',
      'tags.view',
      'tags.create',
      'tags.update',
      'tags.delete',
      'dashboard.view',
      'relatorios.view',
      'notificacoes.view',
    ],
  }

  return roleMap[roleName]
}
