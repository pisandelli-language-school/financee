import { Prisma } from '@prisma/client'
import type { NotificationSeverity } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { generateCashFlow } from '~~/server/utils/reporting'
import { sendInternalNotificationEmail } from '~~/server/utils/email'

interface NotificationDraft {
  userId: string
  title: string
  message: string
  severity: NotificationSeverity
  dedupeKey: string
  actionUrl?: string | null
  entityType?: string | null
  entityId?: string | null
  type?: string | null
  metadata?: Record<string, unknown> | null
}

interface AutomationRuleConfig {
  recipientRoles: string[]
  daysBeforeEnd: number
  daysBeforeDue: number
  daysAfterDue: number
  threshold: number
  graceDays: number
}

interface AutomationSyncResult {
  createdCount: number
  emailedCount: number
}

const globalForNotificationAutomation = globalThis as typeof globalThis & {
  __financeeNotificationAutomationPromise?: Promise<AutomationSyncResult>
  __financeeNotificationAutomationAt?: number
}

function getTodayStartUtc() {
  const now = new Date()

  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0,
  ))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

function getMonthEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function formatDateBr(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function parseRuleConfig(value: unknown): Partial<AutomationRuleConfig> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Partial<AutomationRuleConfig>
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return Math.trunc(parsed)
}

function normalizeThreshold(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function resolveRecipients(roleNames: string[]) {
  if (!roleNames.length) {
    return []
  }

  return await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      internalRole: {
        name: {
          in: roleNames,
        },
        permissions: {
          some: {
            permission: {
              key: 'notificacoes.view',
            },
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })
}

async function createNotification(draft: NotificationDraft) {
  const existing = await prisma.notification.findUnique({
    where: {
      userId_dedupeKey: {
        userId: draft.userId,
        dedupeKey: draft.dedupeKey,
      },
    },
    select: {
      id: true,
      deletedAt: true,
    },
  })

  if (existing) {
    return {
      created: false,
    } as const
  }

  const record = await prisma.notification.create({
    data: {
      userId: draft.userId,
      title: draft.title,
      message: draft.message,
      severity: draft.severity,
      dedupeKey: draft.dedupeKey,
      isPriority: draft.severity === 'CRITICAL',
      actionUrl: draft.actionUrl ?? null,
      entityType: draft.entityType ?? null,
      entityId: draft.entityId ?? null,
      type: draft.type ?? null,
      metadata: draft.metadata == null
        ? Prisma.JsonNull
        : draft.metadata as Prisma.InputJsonValue,
    },
  })

  return {
    created: true,
    record,
  } as const
}

async function deliverNotification(
  recipients: Array<{ id: string, email: string, name: string }>,
  buildDraft: (recipient: { id: string, email: string, name: string }) => NotificationDraft,
) {
  let createdCount = 0
  let emailedCount = 0

  for (const recipient of recipients) {
    const draft = buildDraft(recipient)
    const result = await createNotification(draft)

    if (!result.created) {
      continue
    }

    createdCount += 1

    if (draft.severity === 'CRITICAL') {
      const emailResult = await sendInternalNotificationEmail({
        to: recipient.email,
        title: draft.title,
        message: draft.message,
        ctaUrl: draft.actionUrl,
      })

      if (emailResult.delivered) {
        emailedCount += 1
      }
    }
  }

  return {
    createdCount,
    emailedCount,
  }
}

async function syncContractEndingSoonRule(
  rule: {
    severity: NotificationSeverity
    config: unknown
  },
) {
  const config = parseRuleConfig(rule.config)
  const recipientRoles = Array.isArray(config.recipientRoles)
    ? config.recipientRoles.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  const daysBeforeEnd = normalizePositiveInteger(config.daysBeforeEnd, 15)
  const today = getTodayStartUtc()
  const endLimit = addDays(today, daysBeforeEnd)

  const [recipients, contracts] = await Promise.all([
    resolveRecipients(recipientRoles),
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        expectedEndDate: {
          gte: today,
          lte: endLimit,
        },
      },
      select: {
        id: true,
        title: true,
        expectedEndDate: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  let createdCount = 0
  let emailedCount = 0

  for (const contract of contracts) {
    if (!contract.expectedEndDate) {
      continue
    }

    const expectedEndDate = contract.expectedEndDate

    const delivery = await deliverNotification(recipients, recipient => ({
      userId: recipient.id,
      title: 'Contrato próximo do fim',
      message: `O contrato "${contract.title}" de ${contract.client.name} termina em ${formatDateBr(expectedEndDate)}.`,
      severity: rule.severity,
      dedupeKey: `contract-ending-soon:${contract.id}:${toDateOnly(expectedEndDate)}`,
      actionUrl: '/contratos',
      entityType: 'Contract',
      entityId: contract.id,
      type: 'contract-ending-soon',
      metadata: {
        contractTitle: contract.title,
        clientName: contract.client.name,
        expectedEndDate: toDateOnly(expectedEndDate),
      },
    }))

    createdCount += delivery.createdCount
    emailedCount += delivery.emailedCount
  }

  return {
    createdCount,
    emailedCount,
  }
}

async function syncOverdueEntryRule(
  rule: {
    severity: NotificationSeverity
    config: unknown
  },
) {
  const config = parseRuleConfig(rule.config)
  const recipientRoles = Array.isArray(config.recipientRoles)
    ? config.recipientRoles.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  const daysAfterDue = normalizePositiveInteger(config.daysAfterDue, 0)
  const today = getTodayStartUtc()
  const comparisonDate = daysAfterDue === 0
    ? today
    : addDays(today, -(daysAfterDue - 1))

  const [recipients, entries] = await Promise.all([
    resolveRecipients(recipientRoles),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: 'OPEN',
        effectiveDueDate: {
          lt: comparisonDate,
        },
      },
      select: {
        id: true,
        description: true,
        amount: true,
        effectiveDueDate: true,
        contact: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  let createdCount = 0
  let emailedCount = 0

  for (const entry of entries) {
    const delivery = await deliverNotification(recipients, recipient => ({
      userId: recipient.id,
      title: 'Lançamento vencido',
      message: `O lançamento "${entry.description}" de ${formatCurrency(Number(entry.amount))} venceu em ${formatDateBr(entry.effectiveDueDate)}${entry.contact?.name ? ` para ${entry.contact.name}` : ''}.`,
      severity: rule.severity,
      dedupeKey: `overdue-entry:${entry.id}:${toDateOnly(entry.effectiveDueDate)}`,
      actionUrl: '/lancamentos',
      entityType: 'FinancialEntry',
      entityId: entry.id,
      type: 'overdue-entry',
      metadata: {
        description: entry.description,
        amount: Number(entry.amount),
        effectiveDueDate: toDateOnly(entry.effectiveDueDate),
        contactName: entry.contact?.name ?? null,
      },
    }))

    createdCount += delivery.createdCount
    emailedCount += delivery.emailedCount
  }

  return {
    createdCount,
    emailedCount,
  }
}

async function syncEntryDueSoonRule(
  rule: {
    severity: NotificationSeverity
    config: unknown
  },
) {
  const config = parseRuleConfig(rule.config)
  const recipientRoles = Array.isArray(config.recipientRoles)
    ? config.recipientRoles.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  const daysBeforeDue = normalizePositiveInteger(config.daysBeforeDue, 3)
  const today = getTodayStartUtc()
  const endLimit = addDays(today, daysBeforeDue)

  const [recipients, entries] = await Promise.all([
    resolveRecipients(recipientRoles),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: 'OPEN',
        effectiveDueDate: {
          gte: today,
          lte: endLimit,
        },
      },
      select: {
        id: true,
        description: true,
        amount: true,
        effectiveDueDate: true,
        contact: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  let createdCount = 0
  let emailedCount = 0

  for (const entry of entries) {
    const delivery = await deliverNotification(recipients, recipient => ({
      userId: recipient.id,
      title: 'Lançamento próximo do vencimento',
      message: `O lançamento "${entry.description}" de ${formatCurrency(Number(entry.amount))} vence em ${formatDateBr(entry.effectiveDueDate)}${entry.contact?.name ? ` para ${entry.contact.name}` : ''}.`,
      severity: rule.severity,
      dedupeKey: `entry-due-soon:${entry.id}:${toDateOnly(entry.effectiveDueDate)}:${daysBeforeDue}`,
      actionUrl: '/lancamentos',
      entityType: 'FinancialEntry',
      entityId: entry.id,
      type: 'entry-due-soon',
      metadata: {
        description: entry.description,
        amount: Number(entry.amount),
        effectiveDueDate: toDateOnly(entry.effectiveDueDate),
        contactName: entry.contact?.name ?? null,
        daysBeforeDue,
      },
    }))

    createdCount += delivery.createdCount
    emailedCount += delivery.emailedCount
  }

  return {
    createdCount,
    emailedCount,
  }
}

async function syncNegativeCashFlowRule(
  rule: {
    severity: NotificationSeverity
    config: unknown
  },
) {
  const config = parseRuleConfig(rule.config)
  const recipientRoles = Array.isArray(config.recipientRoles)
    ? config.recipientRoles.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  const threshold = normalizeThreshold(config.threshold, 0)
  const today = getTodayStartUtc()
  const monthStart = getMonthStart(today)
  const monthEnd = getMonthEnd(today)
  const cashFlow = await generateCashFlow({
    regime: 'CASH',
    dateFrom: toDateOnly(monthStart),
    dateTo: toDateOnly(monthEnd),
  })

  if (cashFlow.totals.projectedNet >= threshold) {
    return {
      createdCount: 0,
      emailedCount: 0,
    }
  }

  const recipients = await resolveRecipients(recipientRoles)
  const monthKey = toDateOnly(monthStart).slice(0, 7)

  return await deliverNotification(recipients, recipient => ({
    userId: recipient.id,
    title: 'Fluxo de caixa negativo',
    message: `O saldo projetado do período ${monthKey} está em ${formatCurrency(cashFlow.totals.projectedNet)}, abaixo do limite configurado de ${formatCurrency(threshold)}.`,
    severity: rule.severity,
    dedupeKey: `negative-cash-flow:${monthKey}:${threshold}`,
    actionUrl: '/relatorios/fluxo-caixa',
    entityType: 'Report',
    entityId: monthKey,
    type: 'negative-cash-flow',
    metadata: {
      month: monthKey,
      projectedNet: cashFlow.totals.projectedNet,
      threshold,
    },
  }))
}

async function syncContractWithoutEntriesRule(
  rule: {
    severity: NotificationSeverity
    config: unknown
  },
) {
  const config = parseRuleConfig(rule.config)
  const recipientRoles = Array.isArray(config.recipientRoles)
    ? config.recipientRoles.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  const graceDays = normalizePositiveInteger(config.graceDays, 3)
  const today = getTodayStartUtc()
  const startLimit = addDays(today, -graceDays)

  const [recipients, contracts] = await Promise.all([
    resolveRecipients(recipientRoles),
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        startDate: {
          lte: startLimit,
        },
        entries: {
          none: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  let createdCount = 0
  let emailedCount = 0

  for (const contract of contracts) {
    const delivery = await deliverNotification(recipients, recipient => ({
      userId: recipient.id,
      title: 'Contrato sem lançamentos gerados',
      message: `O contrato "${contract.title}" de ${contract.client.name} está ativo desde ${formatDateBr(contract.startDate)} e ainda não possui lançamentos vinculados.`,
      severity: rule.severity,
      dedupeKey: `contract-without-generated-entries:${contract.id}:${graceDays}`,
      actionUrl: '/contratos',
      entityType: 'Contract',
      entityId: contract.id,
      type: 'contract-without-generated-entries',
      metadata: {
        contractTitle: contract.title,
        clientName: contract.client.name,
        startDate: toDateOnly(contract.startDate),
        graceDays,
      },
    }))

    createdCount += delivery.createdCount
    emailedCount += delivery.emailedCount
  }

  return {
    createdCount,
    emailedCount,
  }
}

async function syncContractWithoutPaymentConditionRule(
  rule: {
    severity: NotificationSeverity
    config: unknown
  },
) {
  const config = parseRuleConfig(rule.config)
  const recipientRoles = Array.isArray(config.recipientRoles)
    ? config.recipientRoles.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []

  const [recipients, contracts] = await Promise.all([
    resolveRecipients(recipientRoles),
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        paymentConditionId: null,
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  let createdCount = 0
  let emailedCount = 0

  for (const contract of contracts) {
    const delivery = await deliverNotification(recipients, recipient => ({
      userId: recipient.id,
      title: 'Contrato sem condição de pagamento',
      message: `O contrato "${contract.title}" de ${contract.client.name} está ativo desde ${formatDateBr(contract.startDate)} e ainda não possui condição de pagamento definida.`,
      severity: rule.severity,
      dedupeKey: `contract-without-payment-condition:${contract.id}`,
      actionUrl: '/contratos',
      entityType: 'Contract',
      entityId: contract.id,
      type: 'contract-without-payment-condition',
      metadata: {
        contractTitle: contract.title,
        clientName: contract.client.name,
        startDate: toDateOnly(contract.startDate),
      },
    }))

    createdCount += delivery.createdCount
    emailedCount += delivery.emailedCount
  }

  return {
    createdCount,
    emailedCount,
  }
}

async function syncRule(
  rule: {
    key: string
    severity: NotificationSeverity
    config: unknown
  },
) {
  switch (rule.key) {
    case 'contract-ending-soon':
      return await syncContractEndingSoonRule(rule)
    case 'overdue-entry':
      return await syncOverdueEntryRule(rule)
    case 'entry-due-soon':
      return await syncEntryDueSoonRule(rule)
    case 'negative-cash-flow':
      return await syncNegativeCashFlowRule(rule)
    case 'contract-without-generated-entries':
      return await syncContractWithoutEntriesRule(rule)
    case 'contract-without-payment-condition':
      return await syncContractWithoutPaymentConditionRule(rule)
    default:
      return {
        createdCount: 0,
        emailedCount: 0,
      }
  }
}

async function executeNotificationAutomationSync() {
  const rules = await prisma.automationRule.findMany({
    where: {
      isEnabled: true,
    },
    select: {
      key: true,
      severity: true,
      config: true,
    },
  })

  let createdCount = 0
  let emailedCount = 0

  for (const rule of rules) {
    const result = await syncRule(rule)

    createdCount += result.createdCount
    emailedCount += result.emailedCount
  }

  return {
    createdCount,
    emailedCount,
  }
}

export async function syncNotificationAutomations(options?: { force?: boolean }) {
  const now = Date.now()
  const syncedAt = globalForNotificationAutomation.__financeeNotificationAutomationAt ?? 0

  if (!options?.force && now - syncedAt < 15_000) {
    return {
      createdCount: 0,
      emailedCount: 0,
    }
  }

  if (globalForNotificationAutomation.__financeeNotificationAutomationPromise) {
    return await globalForNotificationAutomation.__financeeNotificationAutomationPromise
  }

  const promise = executeNotificationAutomationSync()
    .then((result) => {
      globalForNotificationAutomation.__financeeNotificationAutomationAt = Date.now()
      return result
    })
    .finally(() => {
      globalForNotificationAutomation.__financeeNotificationAutomationPromise = undefined
    })

  globalForNotificationAutomation.__financeeNotificationAutomationPromise = promise

  return await promise
}
