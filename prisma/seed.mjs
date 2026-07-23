import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is missing.')
}

assertSafeDatabase(connectionString)

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(connectionString),
})

const systemRoleNames = ['Admin', 'Gestor', 'Financeiro', 'Comercial']
const crudActions = ['view', 'create', 'update', 'delete']
const crudModules = [
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
]
const specialPermissionKeys = [
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
]

const permissionDescriptions = {
  view: 'Visualizar',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir',
  pay: 'Dar baixa',
  cancel: 'Cancelar',
  generate: 'Gerar',
  renew: 'Renovar',
  export: 'Exportar',
  run: 'Executar',
  manage: 'Gerenciar',
}

const moduleDescriptions = {
  lancamentos: 'Lançamentos',
  contatos: 'Contatos',
  categorias: 'Categorias',
  contas: 'Contas',
  'centros-custo': 'Centros de custo',
  tags: 'Tags',
  'formas-pagamento': 'Formas de pagamento',
  'dias-nao-uteis': 'Dias não úteis',
  contratos: 'Contratos',
  usuarios: 'Usuários',
  permissoes: 'Permissões',
  integracoes: 'Integrações',
  notificacoes: 'Notificações',
  automacoes: 'Automações',
  relatorios: 'Relatórios',
  dashboard: 'Dashboard',
  auditoria: 'Auditoria',
  jobs: 'Jobs',
}

const financialInstitutions = [
  { code: 'banco-do-brasil', name: 'Banco do Brasil', logoKey: 'banco-do-brasil' },
  { code: 'bradesco', name: 'Bradesco', logoKey: 'bradesco' },
  { code: 'caixa', name: 'Caixa Econômica', logoKey: 'caixa' },
  { code: 'inter', name: 'Banco Inter', logoKey: 'inter' },
  { code: 'itau', name: 'Itaú', logoKey: 'itau' },
  { code: 'nubank', name: 'Nubank', logoKey: 'nubank' },
  { code: 'pagbank', name: 'PagBank', logoKey: 'pagbank' },
  { code: 'santander', name: 'Santander', logoKey: 'santander' },
]

function assertSafeDatabase(url) {
  const parsed = new URL(url)
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)

  if (!isLocal && process.env.FINANCEE_ALLOW_SEED !== 'true') {
    throw new Error('Seed aborted: DATABASE_URL is not local. Set FINANCEE_ALLOW_SEED=true only if you really want to seed this database.')
  }
}

function buildCrudPermissionKeys() {
  return crudModules.flatMap(moduleName =>
    crudActions.map(action => `${moduleName}.${action}`),
  )
}

function buildPermissionCatalog() {
  return [
    ...buildCrudPermissionKeys(),
    ...specialPermissionKeys,
  ]
}

function getSystemRoleDescription(roleName) {
  return {
    Admin: 'Acesso completo ao sistema.',
    Gestor: 'Acesso gerencial com dashboards, relatórios e auditoria.',
    Financeiro: 'Acesso operacional ao financeiro.',
    Comercial: 'Acesso comercial e contratos.',
  }[roleName]
}

function getSystemRolePermissions(roleName) {
  const allPermissions = buildPermissionCatalog()

  if (roleName === 'Admin') {
    return allPermissions
  }

  return {
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
    ],
  }[roleName] ?? []
}

function date(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

function labelFromPermissionKey(key) {
  const [moduleName = '', action = ''] = key.split('.')
  const actionLabel = permissionDescriptions[action] ?? action
  const moduleLabel = moduleDescriptions[moduleName] ?? moduleName
  return `${actionLabel} ${moduleLabel}`
}

async function seedRbac() {
  const permissionKeys = buildPermissionCatalog()

  for (const key of permissionKeys) {
    const [module = '', action = ''] = key.split('.')

    await prisma.permission.upsert({
      where: { key },
      update: {
        module,
        action,
        description: labelFromPermissionKey(key),
      },
      create: {
        key,
        module,
        action,
        description: labelFromPermissionKey(key),
      },
    })
  }

  for (const roleName of systemRoleNames) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {
        isSystem: true,
        description: getSystemRoleDescription(roleName),
      },
      create: {
        name: roleName,
        description: getSystemRoleDescription(roleName),
        isSystem: true,
      },
    })
  }

  for (const roleName of systemRoleNames) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleName },
      select: { id: true },
    })

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    })

    for (const key of getSystemRolePermissions(roleName)) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key },
        select: { id: true },
      })

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      })
    }
  }
}

async function resetQaData() {
  await prisma.financialEntryTag.deleteMany()
  await prisma.financialEntry.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.contactFinancialResponsible.deleteMany()
  await prisma.address.deleteMany()
  await prisma.contactRoleAssignment.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.category.deleteMany()
  await prisma.account.deleteMany()
  await prisma.financialInstitution.deleteMany()
  await prisma.costCenter.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.paymentMethod.deleteMany()
  await prisma.nonBusinessDay.deleteMany()
}

async function seedAdminUser() {
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'Admin' },
  })

  return await prisma.user.upsert({
    where: {
      email: process.env.SEED_USER_EMAIL ?? 'pedro@pisandelli.com',
    },
    update: {
      name: process.env.SEED_USER_NAME ?? 'Pedro Pisandelli',
      googleWorkspaceRole: 'ADMIN',
      isWorkspaceAdmin: true,
      internalRoleId: adminRole.id,
      isActive: true,
      deletedAt: null,
      preferences: {
        upsert: {
          update: {
            sidebarCollapsed: false,
            locale: 'pt-BR',
            timezone: 'America/Fortaleza',
          },
          create: {
            sidebarCollapsed: false,
            locale: 'pt-BR',
            timezone: 'America/Fortaleza',
          },
        },
      },
    },
    create: {
      email: process.env.SEED_USER_EMAIL ?? 'pedro@pisandelli.com',
      name: process.env.SEED_USER_NAME ?? 'Pedro Pisandelli',
      googleWorkspaceRole: 'ADMIN',
      isWorkspaceAdmin: true,
      internalRoleId: adminRole.id,
      preferences: {
        create: {
          sidebarCollapsed: false,
          locale: 'pt-BR',
          timezone: 'America/Fortaleza',
        },
      },
    },
  })
}

async function seedBackoffice() {
  const institutionMap = new Map()

  for (const institution of financialInstitutions) {
    const record = await prisma.financialInstitution.create({
      data: institution,
    })

    institutionMap.set(institution.code, record)
  }

  const [mensalidades, servicos, software, salarios, impostos] = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Mensalidades',
        type: 'INCOME',
        dreGroup: 'OPERATING_REVENUE',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Serviços educacionais',
        type: 'INCOME',
        dreGroup: 'OPERATING_REVENUE',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Software',
        type: 'EXPENSE',
        dreGroup: 'OPERATING_EXPENSE',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Salários',
        type: 'EXPENSE',
        dreGroup: 'OPERATING_EXPENSE',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Impostos',
        type: 'EXPENSE',
        dreGroup: 'OPERATING_EXPENSE',
      },
    }),
  ])

  const [vip, turmaRegular, folha] = await Promise.all([
    prisma.category.create({
      data: {
        name: 'VIP',
        type: 'INCOME',
        dreGroup: 'OPERATING_REVENUE',
        parentId: mensalidades.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Turma regular',
        type: 'INCOME',
        dreGroup: 'OPERATING_REVENUE',
        parentId: mensalidades.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Pró-labore',
        type: 'EXPENSE',
        dreGroup: 'OPERATING_EXPENSE',
        parentId: salarios.id,
      },
    }),
  ])

  const [contaPrincipal, carteiraDigital, reserva] = await Promise.all([
    prisma.account.create({
      data: {
        name: 'Conta Corrente Principal',
        type: 'Conta Corrente',
        initialValue: '5000.00',
        institutionId: institutionMap.get('itau')?.id ?? null,
        contactEmail: 'contato@itau.com.br',
      },
    }),
    prisma.account.create({
      data: {
        name: 'Carteira Digital',
        type: 'Carteira Digital',
        initialValue: '1250.00',
        institutionId: institutionMap.get('pagbank')?.id ?? null,
        contactEmail: 'contato@pagbank.com.br',
      },
    }),
    prisma.account.create({
      data: {
        name: 'Reserva da Escola',
        type: 'Investimento',
        initialValue: '8000.00',
        institutionId: institutionMap.get('inter')?.id ?? null,
        contactEmail: 'contato@bancointer.com.br',
      },
    }),
  ])

  const [operacional, comercial, administrativo] = await Promise.all([
    prisma.costCenter.create({ data: { name: 'Operacional' } }),
    prisma.costCenter.create({ data: { name: 'Comercial' } }),
    prisma.costCenter.create({ data: { name: 'Administrativo' } }),
  ])

  const [urgente, recorrente, teste] = await Promise.all([
    prisma.tag.create({
      data: {
        name: 'Urgente',
        bgColor: 'var(--dd-color-danger-200)',
        textColor: 'var(--dd-color-danger-700)',
      },
    }),
    prisma.tag.create({
      data: {
        name: 'Recorrente',
        bgColor: 'var(--dd-color-info-200)',
        textColor: 'var(--dd-color-info-700)',
      },
    }),
    prisma.tag.create({
      data: {
        name: 'Teste QA',
        bgColor: 'var(--dd-color-secondary-200)',
        textColor: 'var(--dd-color-secondary-700)',
      },
    }),
  ])

  const [pix, boleto, cartaoCredito, transferenciaBancaria] = await Promise.all([
    prisma.paymentMethod.create({ data: { name: 'Pix' } }),
    prisma.paymentMethod.create({ data: { name: 'Boleto' } }),
    prisma.paymentMethod.create({ data: { name: 'Cartão de crédito' } }),
    prisma.paymentMethod.create({ data: { name: 'Transferência bancária' } }),
  ])

  await Promise.all([
    prisma.nonBusinessDay.create({
      data: {
        title: 'Carnaval',
        type: 'CALCULATED',
        rule: 'EASTER_MINUS_47',
        scope: 'NATIONAL',
      },
    }),
    prisma.nonBusinessDay.create({
      data: {
        title: 'Sexta-feira Santa',
        type: 'CALCULATED',
        rule: 'EASTER_MINUS_2',
        scope: 'NATIONAL',
      },
    }),
    prisma.nonBusinessDay.create({
      data: {
        title: 'Corpus Christi',
        type: 'CALCULATED',
        rule: 'EASTER_PLUS_60',
        scope: 'NATIONAL',
      },
    }),
    prisma.nonBusinessDay.create({
      data: {
        title: 'Natal',
        type: 'FIXED',
        month: 12,
        day: 25,
        scope: 'NATIONAL',
      },
    }),
  ])

  const [pedro, jessica, hatus, simplifica, googleWorkspace] = await Promise.all([
    prisma.contact.create({
      data: {
        name: 'Pedro Pisandelli',
        document: '123.456.789-09',
        documentType: 'CPF',
        nature: 'INDIVIDUAL',
        email: 'pedro@pisandelli.com',
        phone: '(85) 99766-6615',
        notes: 'Contato de QA para validação de cliente.',
        roleAssignments: {
          create: [{ role: 'CLIENT' }],
        },
        address: {
          create: {
            country: 'BRASIL',
            state: 'CE',
            city: 'Fortaleza',
            postalCode: '60165-121',
            street: 'Av. Beira Mar',
            number: '1000',
            district: 'Meireles',
          },
        },
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Jéssika Basílio',
        document: '987.654.321-00',
        documentType: 'CPF',
        nature: 'INDIVIDUAL',
        email: 'jessika@example.com',
        phone: '(85) 98888-0001',
        roleAssignments: {
          create: [{ role: 'CLIENT' }],
        },
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Hatus Rodrigues',
        document: '456.789.123-11',
        documentType: 'CPF',
        nature: 'INDIVIDUAL',
        email: 'hatus@example.com',
        phone: '(85) 98888-0002',
        roleAssignments: {
          create: [{ role: 'CLIENT' }],
        },
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Simplifica CRM',
        tradeName: 'Simplifica',
        document: '12.ABC.345/0001-90',
        documentType: 'CNPJ',
        nature: 'COMPANY',
        email: 'financeiro@simplifica.example',
        phone: '(11) 4000-0101',
        roleAssignments: {
          create: [{ role: 'SUPPLIER' }],
        },
        financialResponsible: {
          create: {
            name: 'Ana Souza',
            email: 'ana@simplifica.example',
            phone: '(11) 4000-0102',
            role: 'Financeiro',
          },
        },
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Google Workspace',
        tradeName: 'Google',
        document: '98.DEF.765/0001-10',
        documentType: 'CNPJ',
        nature: 'COMPANY',
        email: 'billing@google.example',
        roleAssignments: {
          create: [{ role: 'SUPPLIER' }],
        },
      },
    }),
  ])

  return {
    categories: {
      mensalidades,
      servicos,
      software,
      salarios,
      impostos,
      vip,
      turmaRegular,
      folha,
    },
    accounts: {
      contaPrincipal,
      carteiraDigital,
      reserva,
    },
    costCenters: {
      operacional,
      comercial,
      administrativo,
    },
    tags: {
      urgente,
      recorrente,
      teste,
    },
    paymentMethods: {
      pix,
      boleto,
      cartaoCredito,
      transferenciaBancaria,
    },
    contacts: {
      pedro,
      jessica,
      hatus,
      simplifica,
      googleWorkspace,
    },
  }
}

async function seedFinancialEntries(context) {
  const transferGroupId = randomUUID()

  await prisma.financialEntry.create({
    data: {
      direction: 'INCOME',
      type: 'NORMAL',
      status: 'PAID',
      description: 'VIP - Jéssika M2',
      amount: '880.00',
      competenceDate: date('2026-07-01'),
      scheduledDueDate: date('2026-07-01'),
      effectiveDueDate: date('2026-07-01'),
      paymentDate: date('2026-07-01'),
      accountId: context.accounts.contaPrincipal.id,
      paymentAccountId: context.accounts.contaPrincipal.id,
      paymentMethodId: context.paymentMethods.pix.id,
      contactId: context.contacts.jessica.id,
      categoryId: context.categories.mensalidades.id,
      subcategoryId: context.categories.vip.id,
      costCenterId: context.costCenters.comercial.id,
      recurrenceType: 'INSTALLMENT',
      recurrenceIndex: 4,
      recurrenceTotal: 6,
      tags: {
        create: [{ tagId: context.tags.teste.id }],
      },
    },
  })

  await prisma.financialEntry.create({
    data: {
      direction: 'INCOME',
      type: 'NORMAL',
      status: 'OPEN',
      description: 'Teste parcelamento',
      amount: '550.00',
      competenceDate: date('2026-07-25'),
      scheduledDueDate: date('2026-07-25'),
      effectiveDueDate: date('2026-07-27'),
      accountId: context.accounts.contaPrincipal.id,
      paymentMethodId: context.paymentMethods.boleto.id,
      contactId: context.contacts.pedro.id,
      categoryId: context.categories.mensalidades.id,
      subcategoryId: context.categories.turmaRegular.id,
      costCenterId: context.costCenters.comercial.id,
      recurrenceType: 'INSTALLMENT',
      recurrenceIndex: 1,
      recurrenceTotal: 5,
      tags: {
        create: [{ tagId: context.tags.urgente.id }],
      },
    },
  })

  await prisma.financialEntry.create({
    data: {
      direction: 'EXPENSE',
      type: 'NORMAL',
      status: 'OPEN',
      description: 'Google Workspace',
      amount: '72.90',
      competenceDate: date('2026-07-18'),
      scheduledDueDate: date('2026-07-18'),
      effectiveDueDate: date('2026-07-20'),
      accountId: context.accounts.contaPrincipal.id,
      paymentMethodId: context.paymentMethods.cartaoCredito.id,
      contactId: context.contacts.googleWorkspace.id,
      categoryId: context.categories.software.id,
      costCenterId: context.costCenters.operacional.id,
      tags: {
        create: [{ tagId: context.tags.recorrente.id }],
      },
    },
  })

  await prisma.financialEntry.create({
    data: {
      direction: 'EXPENSE',
      type: 'NORMAL',
      status: 'PAID',
      description: 'Simplifica CRM',
      amount: '400.00',
      competenceDate: date('2026-07-10'),
      scheduledDueDate: date('2026-07-10'),
      effectiveDueDate: date('2026-07-10'),
      paymentDate: date('2026-07-10'),
      accountId: context.accounts.contaPrincipal.id,
      paymentAccountId: context.accounts.contaPrincipal.id,
      paymentMethodId: context.paymentMethods.transferenciaBancaria.id,
      contactId: context.contacts.simplifica.id,
      categoryId: context.categories.software.id,
      costCenterId: context.costCenters.operacional.id,
    },
  })

  await prisma.financialEntry.create({
    data: {
      direction: 'EXPENSE',
      type: 'NORMAL',
      status: 'CANCELED',
      description: 'Assinatura cancelada',
      amount: '120.00',
      competenceDate: date('2026-07-12'),
      scheduledDueDate: date('2026-07-12'),
      effectiveDueDate: date('2026-07-13'),
      accountId: context.accounts.carteiraDigital.id,
      paymentMethodId: context.paymentMethods.cartaoCredito.id,
      contactId: context.contacts.simplifica.id,
      categoryId: context.categories.software.id,
      costCenterId: context.costCenters.operacional.id,
      notes: 'Registro de QA para status cancelado.',
    },
  })

  await prisma.financialEntry.createMany({
    data: [
      {
        direction: 'EXPENSE',
        type: 'TRANSFER',
        status: 'OPEN',
        description: 'Transferência para reserva',
        amount: '250.00',
        competenceDate: date('2026-07-18'),
        scheduledDueDate: date('2026-07-18'),
        effectiveDueDate: date('2026-07-20'),
        accountId: context.accounts.contaPrincipal.id,
        recurrenceType: 'ONE_TIME',
        transferGroupId,
      },
      {
        direction: 'INCOME',
        type: 'TRANSFER',
        status: 'OPEN',
        description: 'Transferência para reserva',
        amount: '250.00',
        competenceDate: date('2026-07-18'),
        scheduledDueDate: date('2026-07-18'),
        effectiveDueDate: date('2026-07-20'),
        accountId: context.accounts.reserva.id,
        recurrenceType: 'ONE_TIME',
        transferGroupId,
      },
    ],
  })

  await prisma.financialEntry.createMany({
    data: [
      {
        direction: 'INCOME',
        type: 'NORMAL',
        status: 'PAID',
        description: 'Mensalidades junho',
        amount: '1200.00',
        competenceDate: date('2026-06-10'),
        scheduledDueDate: date('2026-06-10'),
        effectiveDueDate: date('2026-06-10'),
        paymentDate: date('2026-06-10'),
        accountId: context.accounts.contaPrincipal.id,
        paymentAccountId: context.accounts.contaPrincipal.id,
        paymentMethodId: context.paymentMethods.pix.id,
        contactId: context.contacts.hatus.id,
        categoryId: context.categories.mensalidades.id,
        subcategoryId: context.categories.vip.id,
        costCenterId: context.costCenters.comercial.id,
      },
      {
        direction: 'EXPENSE',
        type: 'NORMAL',
        status: 'PAID',
        description: 'Pró-labore junho',
        amount: '900.00',
        competenceDate: date('2026-06-05'),
        scheduledDueDate: date('2026-06-05'),
        effectiveDueDate: date('2026-06-05'),
        paymentDate: date('2026-06-05'),
        accountId: context.accounts.contaPrincipal.id,
        paymentAccountId: context.accounts.contaPrincipal.id,
        categoryId: context.categories.salarios.id,
        subcategoryId: context.categories.folha.id,
        costCenterId: context.costCenters.administrativo.id,
      },
    ],
  })
}

async function seedAuditLogs(user) {
  await prisma.auditLog.createMany({
    data: [
      {
        severity: 'INFO',
        eventType: 'seed.qa_created',
        entityType: 'Seed',
        entityId: 'qa-data',
        entityLabel: 'Dados de QA',
        action: 'create',
        userId: user.id,
        userEmail: user.email,
        metadata: {
          source: 'prisma/seed.mjs',
        },
      },
      {
        severity: 'WARNING',
        eventType: 'lancamentos.cancelled',
        entityType: 'FinancialEntry',
        entityId: 'sample-canceled-entry',
        entityLabel: 'Assinatura cancelada',
        action: 'cancel',
        userId: user.id,
        userEmail: user.email,
        metadata: {
          source: 'qa-seed',
        },
      },
    ],
  })
}

async function main() {
  console.log('Seeding Financee local QA database...')

  await seedRbac()
  await resetQaData()
  const adminUser = await seedAdminUser()
  const context = await seedBackoffice()
  await seedFinancialEntries(context)
  await seedAuditLogs(adminUser)

  console.log('Seed completed.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
