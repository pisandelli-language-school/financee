import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import {
  automationRules,
  financialInstitutions,
  jobDefinitions,
  paymentConditions,
} from './seed-data.mjs'

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
  await prisma.jobExecution.deleteMany()
  await prisma.jobDefinition.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.automationRule.deleteMany()
  await prisma.financialEntryTag.deleteMany()
  await prisma.financialEntry.deleteMany()
  await prisma.contract.deleteMany()
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

async function seedAutomationRules() {
  for (const rule of automationRules) {
    await prisma.automationRule.upsert({
      where: { key: rule.key },
      update: {
        title: rule.title,
        isEnabled: true,
        severity: rule.severity,
        config: rule.config,
      },
      create: {
        key: rule.key,
        title: rule.title,
        isEnabled: true,
        severity: rule.severity,
        config: rule.config,
      },
    })
  }
}

async function seedJobs() {
  for (const job of jobDefinitions) {
    await prisma.jobDefinition.upsert({
      where: { key: job.key },
      update: {
        title: job.title,
        mode: job.mode,
        isEnabled: true,
        scheduleLabel: job.scheduleLabel,
      },
      create: {
        key: job.key,
        title: job.title,
        mode: job.mode,
        isEnabled: true,
        scheduleLabel: job.scheduleLabel,
      },
    })
  }

  const [contractsJob, overdueJob, recurrenceJob, cashflowJob, notificationsJob, withoutEntriesJob] = await Promise.all([
    prisma.jobDefinition.findUniqueOrThrow({
      where: { key: 'check-contracts' },
      select: { key: true },
    }),
    prisma.jobDefinition.findUniqueOrThrow({
      where: { key: 'check-overdue-entries' },
      select: { key: true },
    }),
    prisma.jobDefinition.findUniqueOrThrow({
      where: { key: 'extend-recurrence-window' },
      select: { key: true },
    }),
    prisma.jobDefinition.findUniqueOrThrow({
      where: { key: 'check-cashflow' },
      select: { key: true },
    }),
    prisma.jobDefinition.findUniqueOrThrow({
      where: { key: 'expire-notifications' },
      select: { key: true },
    }),
    prisma.jobDefinition.findUniqueOrThrow({
      where: { key: 'check-contracts-without-entries' },
      select: { key: true },
    }),
  ])

  await prisma.jobExecution.createMany({
    data: [
      {
        jobKey: contractsJob.key,
        status: 'SUCCESS',
        startedAt: new Date('2026-08-02T05:00:00.000Z'),
        finishedAt: new Date('2026-08-02T05:00:01.280Z'),
        durationMs: 1280,
        metadata: {
          scannedContracts: 4,
          notificationsCreated: 1,
          source: 'qa-seed',
        },
      },
      {
        jobKey: overdueJob.key,
        status: 'PARTIAL',
        startedAt: new Date('2026-08-02T05:02:00.000Z'),
        finishedAt: new Date('2026-08-02T05:02:02.040Z'),
        durationMs: 2040,
        errorMessage: '1 lançamento sem contato definido foi ignorado.',
        metadata: {
          scannedEntries: 7,
          overdueEntries: 3,
          notificationsCreated: 2,
          skippedEntries: 1,
          source: 'qa-seed',
        },
      },
      {
        jobKey: recurrenceJob.key,
        status: 'FAILED',
        startedAt: new Date('2026-08-01T05:04:00.000Z'),
        finishedAt: new Date('2026-08-01T05:04:01.090Z'),
        durationMs: 1090,
        errorMessage: 'Grupo de recorrência seed:vip-legacy sem frequência configurada.',
        metadata: {
          source: 'qa-seed',
        },
      },
      {
        jobKey: cashflowJob.key,
        status: 'SUCCESS',
        startedAt: new Date('2026-08-03T05:06:00.000Z'),
        finishedAt: new Date('2026-08-03T05:06:00.840Z'),
        durationMs: 840,
        metadata: {
          month: '2026-08',
          projectedBalance: 13877.10,
          source: 'qa-seed',
        },
      },
      {
        jobKey: notificationsJob.key,
        status: 'SUCCESS',
        startedAt: new Date('2026-08-04T05:10:00.000Z'),
        finishedAt: new Date('2026-08-04T05:10:00.610Z'),
        durationMs: 610,
        metadata: {
          archivedNotifications: 3,
          source: 'qa-seed',
        },
      },
      {
        jobKey: withoutEntriesJob.key,
        status: 'SUCCESS',
        startedAt: new Date('2026-08-05T05:15:00.000Z'),
        finishedAt: new Date('2026-08-05T05:15:01.170Z'),
        durationMs: 1170,
        metadata: {
          scannedContracts: 7,
          pendingContracts: 1,
          source: 'qa-seed',
        },
      },
    ],
  })
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
            dashboardDefaultView: 'FINANCIAL',
            lastReportPeriod: null,
            lastReportView: null,
            lastReportRegime: null,
            locale: 'pt-BR',
            timezone: 'America/Fortaleza',
          },
          create: {
            sidebarCollapsed: false,
            dashboardDefaultView: 'FINANCIAL',
            lastReportPeriod: null,
            lastReportView: null,
            lastReportRegime: null,
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
          dashboardDefaultView: 'FINANCIAL',
          lastReportPeriod: null,
          lastReportView: null,
          lastReportRegime: null,
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

  const paymentConditionRecords = new Map()

  for (const conditionName of paymentConditions) {
    const record = await prisma.paymentCondition.create({
      data: {
        name: conditionName,
      },
    })

    paymentConditionRecords.set(conditionName, record)
  }

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

  const [pedro, jessica, hatus, raphaela, cassia, simplifica, googleWorkspace, owlBooks] = await Promise.all([
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
        name: 'Raphaela Vianna',
        document: '654.321.987-00',
        documentType: 'CPF',
        nature: 'INDIVIDUAL',
        email: 'raphaela@example.com',
        phone: '(85) 98888-0003',
        roleAssignments: {
          create: [{ role: 'CLIENT' }],
        },
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Cássia Inglês',
        document: '789.654.123-55',
        documentType: 'CPF',
        nature: 'INDIVIDUAL',
        email: 'cassia@example.com',
        phone: '(85) 98888-0004',
        roleAssignments: {
          create: [{ role: 'CLIENT' }, { role: 'OTHER' }],
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
    prisma.contact.create({
      data: {
        name: 'Owl Books Ltd.',
        document: 'AB-778899',
        documentType: 'FOREIGN_DOCUMENT',
        nature: 'FOREIGN',
        email: 'billing@owlbooks.example',
        phone: '+44 20 7000 1000',
        roleAssignments: {
          create: [{ role: 'SUPPLIER' }],
        },
        address: {
          create: {
            country: 'UNITED KINGDOM',
            city: 'London',
            street: '221B Baker Street',
            number: '221B',
          },
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
    paymentConditions: {
      avista: paymentConditionRecords.get('À vista'),
      mensal: paymentConditionRecords.get('Mensal'),
      trimestral: paymentConditionRecords.get('Trimestral'),
      seisX: paymentConditionRecords.get('6x'),
      dozeX: paymentConditionRecords.get('12x'),
    },
    contacts: {
      pedro,
      jessica,
      hatus,
      raphaela,
      cassia,
      simplifica,
      googleWorkspace,
      owlBooks,
    },
  }
}

async function seedContracts(context) {
  const contratoVip = await prisma.contract.create({
    data: {
      title: 'Contrato VIP - Jéssika Basílio',
      clientId: context.contacts.jessica.id,
      status: 'ACTIVE',
      originalAmount: '9800.00',
      discountAmount: '10.00',
      finalAmount: '8820.00',
      totalHours: 96,
      weeklyHours: 6,
      startDate: date('2026-07-01'),
      expectedEndDate: date('2026-12-31'),
      billingModel: 'INSTALLMENT',
      paymentConditionId: context.paymentConditions.seisX?.id,
      firstDueDate: date('2026-07-01'),
      notes: 'Contrato ativo de acompanhamento VIP com desconto promocional de 10%.',
      source: 'LOCAL',
    },
  })

  const propostaIntensivo = await prisma.contract.create({
    data: {
      title: 'Proposta Intensivo - Pedro Pisandelli',
      clientId: context.contacts.pedro.id,
      status: 'PROPOSAL',
      originalAmount: '2400.00',
      discountAmount: '0.00',
      finalAmount: '2400.00',
      totalHours: 24,
      weeklyHours: 4,
      startDate: date('2026-08-03'),
      expectedEndDate: date('2026-09-11'),
      billingModel: 'CASH',
      paymentConditionId: context.paymentConditions.avista?.id,
      notes: 'Proposta comercial em análise.',
      source: 'LOCAL',
    },
  })

  const contratoCorporativo = await prisma.contract.create({
    data: {
      title: 'Contrato Corporativo - Hatus',
      clientId: context.contacts.hatus.id,
      status: 'ACTIVE',
      originalAmount: '18000.00',
      discountAmount: '5.00',
      finalAmount: '17100.00',
      totalHours: 120,
      weeklyHours: 8,
      startDate: date('2026-06-01'),
      expectedEndDate: date('2026-11-30'),
      billingModel: 'RECURRING',
      billingFrequency: 'QUARTERLY',
      billingOccurrences: 2,
      firstDueDate: date('2026-06-05'),
      paymentConditionId: context.paymentConditions.trimestral?.id,
      notes: 'Contrato corporativo com faturamento trimestral.',
      source: 'LOCAL',
    },
  })

  const renovacaoVip = await prisma.contract.create({
    data: {
      title: 'Renovação VIP - Jéssika Basílio',
      clientId: context.contacts.jessica.id,
      status: 'RENEWED',
      originalAmount: '10200.00',
      discountAmount: '8.00',
      finalAmount: '9384.00',
      totalHours: 96,
      weeklyHours: 6,
      startDate: date('2027-01-05'),
      expectedEndDate: date('2027-06-30'),
      renewalOfContractId: contratoVip.id,
      billingModel: 'INSTALLMENT',
      paymentConditionId: context.paymentConditions.seisX?.id,
      firstDueDate: date('2027-01-05'),
      notes: 'Renovação já registrada para o próximo ciclo.',
      source: 'LOCAL',
    },
  })

  const contratoRaphaela = await prisma.contract.create({
    data: {
      title: 'Contrato Regular - Raphaela Vianna',
      clientId: context.contacts.raphaela.id,
      status: 'ACTIVE',
      originalAmount: '5280.00',
      discountAmount: '0.00',
      finalAmount: '5280.00',
      totalHours: 48,
      weeklyHours: 3,
      startDate: date('2026-08-01'),
      expectedEndDate: date('2026-12-20'),
      billingModel: 'RECURRING',
      billingFrequency: 'MONTHLY',
      billingOccurrences: 5,
      firstDueDate: date('2026-08-04'),
      paymentConditionId: context.paymentConditions.mensal?.id,
      notes: 'Contrato mensal com geração recorrente esperada.',
      source: 'LOCAL',
    },
  })

  const contratoCassiaTrancado = await prisma.contract.create({
    data: {
      title: 'Contrato Trancado - Cássia Inglês',
      clientId: context.contacts.cassia.id,
      status: 'LOCKED',
      originalAmount: '3600.00',
      discountAmount: '0.00',
      finalAmount: '3600.00',
      totalHours: 32,
      weeklyHours: 2,
      startDate: date('2026-05-01'),
      expectedEndDate: date('2026-10-31'),
      billingModel: 'RECURRING',
      billingFrequency: 'MONTHLY',
      billingOccurrences: 6,
      firstDueDate: date('2026-05-05'),
      paymentConditionId: context.paymentConditions.mensal?.id,
      notes: 'Contrato pausado temporariamente por solicitação da aluna.',
      source: 'LOCAL',
    },
  })

  const contratoEncerrado = await prisma.contract.create({
    data: {
      title: 'Contrato Encerrado - Pedro Pisandelli',
      clientId: context.contacts.pedro.id,
      status: 'CLOSED',
      originalAmount: '2280.00',
      discountAmount: '0.00',
      finalAmount: '2280.00',
      totalHours: 24,
      weeklyHours: 4,
      startDate: date('2026-01-15'),
      expectedEndDate: date('2026-04-15'),
      billingModel: 'INSTALLMENT',
      paymentConditionId: context.paymentConditions.avista?.id,
      notes: 'Contrato antigo encerrado após conclusão do ciclo.',
      source: 'LOCAL',
    },
  })

  const contratoCancelado = await prisma.contract.create({
    data: {
      title: 'Proposta Cancelada - Pedro Pisandelli',
      clientId: context.contacts.pedro.id,
      status: 'CANCELED',
      originalAmount: '1800.00',
      discountAmount: '0.00',
      finalAmount: '1800.00',
      totalHours: 20,
      weeklyHours: 4,
      startDate: date('2026-07-10'),
      expectedEndDate: date('2026-08-28'),
      billingModel: 'CASH',
      paymentConditionId: context.paymentConditions.avista?.id,
      notes: 'Proposta cancelada pelo cliente antes da assinatura.',
      source: 'LOCAL',
    },
  })

  const rascunhoCorporativo = await prisma.contract.create({
    data: {
      title: 'Rascunho Corporativo - Owl Books',
      clientId: context.contacts.hatus.id,
      status: 'DRAFT',
      originalAmount: '6400.00',
      discountAmount: '7.50',
      finalAmount: '5920.00',
      totalHours: 40,
      weeklyHours: 2,
      startDate: date('2026-09-01'),
      expectedEndDate: date('2026-12-15'),
      billingModel: 'RECURRING',
      billingFrequency: 'MONTHLY',
      billingOccurrences: 4,
      firstDueDate: date('2026-09-05'),
      paymentConditionId: context.paymentConditions.mensal?.id,
      notes: 'Rascunho comercial para expansão internacional.',
      source: 'LOCAL',
    },
  })

  return {
    contratoVip,
    propostaIntensivo,
    contratoCorporativo,
    renovacaoVip,
    contratoRaphaela,
    contratoCassiaTrancado,
    contratoEncerrado,
    contratoCancelado,
    rascunhoCorporativo,
  }
}

async function seedFinancialEntries(context, contracts) {
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
      contractId: contracts.contratoVip.id,
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
      contractId: contracts.propostaIntensivo.id,
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
      contractId: contracts.contratoCorporativo.id,
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
      {
        direction: 'INCOME',
        type: 'NORMAL',
        status: 'OPEN',
        description: 'Mensalidade agosto - Raphaela Vianna',
        amount: '1056.00',
        competenceDate: date('2026-08-01'),
        scheduledDueDate: date('2026-08-04'),
        effectiveDueDate: date('2026-08-04'),
        accountId: context.accounts.contaPrincipal.id,
        paymentMethodId: context.paymentMethods.pix.id,
        contactId: context.contacts.raphaela.id,
        contractId: contracts.contratoRaphaela.id,
        categoryId: context.categories.mensalidades.id,
        subcategoryId: context.categories.turmaRegular.id,
        costCenterId: context.costCenters.comercial.id,
        recurrenceType: 'FIXED',
        recurrenceFrequency: 'MONTHLY',
        recurrenceGroupId: 'seed:raphaela-2026',
        recurrenceIndex: 1,
        recurrenceTotal: 5,
      },
      {
        direction: 'INCOME',
        type: 'NORMAL',
        status: 'OPEN',
        description: 'Mensalidade setembro - Raphaela Vianna',
        amount: '1056.00',
        competenceDate: date('2026-09-01'),
        scheduledDueDate: date('2026-09-04'),
        effectiveDueDate: date('2026-09-04'),
        accountId: context.accounts.contaPrincipal.id,
        paymentMethodId: context.paymentMethods.pix.id,
        contactId: context.contacts.raphaela.id,
        contractId: contracts.contratoRaphaela.id,
        categoryId: context.categories.mensalidades.id,
        subcategoryId: context.categories.turmaRegular.id,
        costCenterId: context.costCenters.comercial.id,
        recurrenceType: 'FIXED',
        recurrenceFrequency: 'MONTHLY',
        recurrenceGroupId: 'seed:raphaela-2026',
        recurrenceIndex: 2,
        recurrenceTotal: 5,
      },
      {
        direction: 'EXPENSE',
        type: 'NORMAL',
        status: 'OPEN',
        description: 'Imposto DAS agosto',
        amount: '680.50',
        competenceDate: date('2026-08-01'),
        scheduledDueDate: date('2026-08-20'),
        effectiveDueDate: date('2026-08-20'),
        accountId: context.accounts.contaPrincipal.id,
        paymentMethodId: context.paymentMethods.boleto.id,
        categoryId: context.categories.impostos.id,
        costCenterId: context.costCenters.administrativo.id,
        notes: 'Despesa fiscal aguardando pagamento.',
      },
      {
        direction: 'EXPENSE',
        type: 'NORMAL',
        status: 'PAID',
        description: 'Material didático importado',
        amount: '312.40',
        competenceDate: date('2026-07-22'),
        scheduledDueDate: date('2026-07-22'),
        effectiveDueDate: date('2026-07-22'),
        paymentDate: date('2026-07-22'),
        accountId: context.accounts.carteiraDigital.id,
        paymentAccountId: context.accounts.carteiraDigital.id,
        paymentMethodId: context.paymentMethods.cartaoCredito.id,
        contactId: context.contacts.owlBooks.id,
        categoryId: context.categories.software.id,
        costCenterId: context.costCenters.operacional.id,
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

async function seedNotifications(user) {
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        title: 'Cobrança vencida',
        message: 'O lançamento "Teste parcelamento" venceu e segue em aberto.',
        type: 'financial-entry',
        severity: 'CRITICAL',
        isRead: false,
        isPriority: true,
        entityType: 'FinancialEntry',
        entityId: 'seed-open-entry',
        actionUrl: '/lancamentos',
        dedupeKey: 'seed:overdue-entry:teste-parcelamento',
        metadata: {
          source: 'seed',
          ruleKey: 'overdue-entry',
          contextLabel: 'Transferência para reserva',
        },
      },
      {
        userId: user.id,
        title: 'Contrato sem lançamentos gerados',
        message: 'O contrato "Proposta Intensivo - Pedro Pisandelli" ainda não gerou lançamentos.',
        type: 'contract',
        severity: 'WARNING',
        isRead: false,
        isPriority: false,
        entityType: 'Contract',
        entityId: 'seed-contract-without-entries',
        actionUrl: '/contratos',
        dedupeKey: 'seed:contract-without-generated-entries:proposta-intensivo',
        metadata: {
          source: 'seed',
          ruleKey: 'contract-without-generated-entries',
          contextLabel: 'Proposta Intensivo - Pedro Pisandelli',
        },
      },
      {
        userId: user.id,
        title: 'Preferências atualizadas',
        message: 'Suas preferências do Financee foram sincronizadas com sucesso.',
        type: 'system',
        severity: 'INFO',
        isRead: true,
        readAt: new Date('2026-07-20T12:00:00.000Z'),
        isPriority: false,
        entityType: 'UserPreferences',
        entityId: user.id,
        actionUrl: '/configuracoes/usuarios',
        dedupeKey: 'seed:preferences-synced',
        metadata: {
          source: 'seed',
        },
      },
      {
        userId: user.id,
        title: 'Contrato próximo do fim',
        message: 'O contrato "Contrato VIP - Jéssika Basílio" entrará na janela de renovação nos próximos 15 dias.',
        type: 'contract',
        severity: 'WARNING',
        isRead: true,
        readAt: new Date('2026-08-01T09:15:00.000Z'),
        isPriority: false,
        entityType: 'Contract',
        entityId: 'seed-contract-ending-soon',
        actionUrl: '/contratos',
        dedupeKey: 'seed:contract-ending-soon:jessika-vip',
        metadata: {
          source: 'seed',
          ruleKey: 'contract-ending-soon',
          contextLabel: 'Contrato VIP - Jéssika Basílio',
        },
      },
      {
        userId: user.id,
        title: 'Fluxo monitorado',
        message: 'A central de notificações está pronta para acompanhar alertas operacionais.',
        type: 'system',
        severity: 'INFO',
        isRead: false,
        isPriority: false,
        entityType: 'Dashboard',
        entityId: 'financeiro',
        actionUrl: '/dashboard/financeiro',
        dedupeKey: 'seed:info:notification-center-ready',
        metadata: {
          source: 'seed',
          contextLabel: 'Dashboard financeiro',
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
  await seedJobs()
  await seedAutomationRules()
  const context = await seedBackoffice()
  const contracts = await seedContracts(context)
  await seedFinancialEntries(context, contracts)
  await seedAuditLogs(adminUser)
  await seedNotifications(adminUser)

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
