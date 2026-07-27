import type {
  CashFlowReport,
  ContractsReport,
  ContractsReportItem,
  DelinquencyFilters,
  DelinquencyRecord,
  DelinquencyReport,
  DreReport,
  FinancialDashboardData,
  OperationalDashboardData,
  ReportingDateRangeFilters,
  ReportingFilters,
  ReportRegime,
} from '~~/app/types/reporting'
import { prisma } from '~~/server/utils/prisma'
import {
  buildCashFlowBuckets,
  buildDreGroups,
  calculateOverdueDays,
  deriveDelinquencyTemperature,
} from '~~/server/utils/reporting-helpers'

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDateOnly(value: string, fieldLabel: string) {
  const normalized = normalizeString(value)

  if (!normalized) {
    throw createError({
      statusCode: 400,
      message: `${fieldLabel} é obrigatório.`,
    })
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`)

  if (Number.isNaN(parsed.valueOf())) {
    throw createError({
      statusCode: 400,
      message: `${fieldLabel} é inválido.`,
    })
  }

  return parsed
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function parseReportRegime(value: unknown): ReportRegime {
  return value === 'COMPETENCE' ? 'COMPETENCE' : 'CASH'
}

export function parseReportingFilters(event: Parameters<typeof getQuery>[0]): ReportingFilters {
  const query = getQuery(event)
  const dateFrom = parseDateOnly(String(query.dateFrom ?? ''), 'Data inicial')
  const dateTo = parseDateOnly(String(query.dateTo ?? ''), 'Data final')

  if (dateFrom > dateTo) {
    throw createError({
      statusCode: 400,
      message: 'A data inicial deve ser menor ou igual à data final.',
    })
  }

  return {
    regime: parseReportRegime(query.regime),
    dateFrom: formatDateOnly(dateFrom),
    dateTo: formatDateOnly(dateTo),
  }
}

export function parseDelinquencyFilters(event: Parameters<typeof getQuery>[0]): DelinquencyFilters {
  const query = getQuery(event)
  const dateFrom = parseDateOnly(String(query.dateFrom ?? ''), 'Data inicial')
  const dateTo = parseDateOnly(String(query.dateTo ?? ''), 'Data final')
  const referenceDate = parseDateOnly(String(query.referenceDate ?? formatDateOnly(new Date())), 'Data de referência')

  if (dateFrom > dateTo) {
    throw createError({
      statusCode: 400,
      message: 'A data inicial deve ser menor ou igual à data final.',
    })
  }

  return {
    dateFrom: formatDateOnly(dateFrom),
    dateTo: formatDateOnly(dateTo),
    referenceDate: formatDateOnly(referenceDate),
  }
}

export function parseDateRangeFilters(event: Parameters<typeof getQuery>[0]): ReportingDateRangeFilters {
  const query = getQuery(event)
  const dateFrom = parseDateOnly(String(query.dateFrom ?? ''), 'Data inicial')
  const dateTo = parseDateOnly(String(query.dateTo ?? ''), 'Data final')

  if (dateFrom > dateTo) {
    throw createError({
      statusCode: 400,
      message: 'A data inicial deve ser menor ou igual à data final.',
    })
  }

  return {
    dateFrom: formatDateOnly(dateFrom),
    dateTo: formatDateOnly(dateTo),
  }
}

export async function generateCashFlow(filters: ReportingFilters): Promise<CashFlowReport> {
  const dateField = filters.regime === 'CASH' ? 'paymentDate' : 'competenceDate'
  const openDateField = filters.regime === 'CASH' ? 'effectiveDueDate' : 'competenceDate'

  const [paidEntries, openEntries] = await Promise.all([
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: 'PAID',
        [dateField]: {
          gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
        },
      },
      select: {
        direction: true,
        amount: true,
        competenceDate: true,
        effectiveDueDate: true,
        paymentDate: true,
      },
    }),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: 'OPEN',
        [openDateField]: {
          gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
        },
      },
      select: {
        direction: true,
        amount: true,
        competenceDate: true,
        effectiveDueDate: true,
        paymentDate: true,
      },
    }),
  ])

  const buckets = buildCashFlowBuckets(
    [
      ...paidEntries.map(entry => ({
        kind: 'realized' as const,
        direction: entry.direction,
        amount: Number(entry.amount),
        date: filters.regime === 'CASH'
          ? entry.paymentDate ?? entry.effectiveDueDate
          : entry.competenceDate,
      })),
      ...openEntries.map(entry => ({
        kind: 'projected' as const,
        direction: entry.direction,
        amount: Number(entry.amount),
        date: filters.regime === 'CASH'
          ? entry.effectiveDueDate
          : entry.competenceDate,
      })),
    ],
    filters.dateFrom,
    filters.dateTo,
  )

  return {
    regime: filters.regime,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    buckets,
    totals: buckets.reduce((accumulator, bucket) => ({
      realizedIncome: accumulator.realizedIncome + bucket.realizedIncome,
      realizedExpense: accumulator.realizedExpense + bucket.realizedExpense,
      realizedNet: accumulator.realizedNet + bucket.realizedNet,
      projectedIncome: accumulator.projectedIncome + bucket.projectedIncome,
      projectedExpense: accumulator.projectedExpense + bucket.projectedExpense,
      projectedNet: accumulator.projectedNet + bucket.projectedNet,
    }), {
      realizedIncome: 0,
      realizedExpense: 0,
      realizedNet: 0,
      projectedIncome: 0,
      projectedExpense: 0,
      projectedNet: 0,
    }),
  }
}

export async function generateDelinquencyReport(filters: DelinquencyFilters): Promise<DelinquencyReport> {
  const items = await prisma.financialEntry.findMany({
    where: {
      deletedAt: null,
      status: 'OPEN',
      effectiveDueDate: {
        gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
        lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
        lt: new Date(`${filters.referenceDate}T00:00:00.000Z`),
      },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      scheduledDueDate: true,
      effectiveDueDate: true,
      contact: {
        select: {
          name: true,
        },
      },
      account: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { effectiveDueDate: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  const normalizedItems = items.map(item => {
    const effectiveDueDate = formatDateOnly(item.effectiveDueDate)
    const overdueDays = calculateOverdueDays(effectiveDueDate, filters.referenceDate)

    return {
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      contactName: item.contact?.name ?? null,
      accountName: item.account.name,
      effectiveDueDate,
      scheduledDueDate: formatDateOnly(item.scheduledDueDate),
      overdueDays,
      temperature: deriveDelinquencyTemperature(overdueDays),
    } satisfies DelinquencyRecord
  })

  return {
    referenceDate: filters.referenceDate,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    items: normalizedItems,
    totals: normalizedItems.reduce((accumulator, item) => ({
      count: accumulator.count + 1,
      amount: accumulator.amount + item.amount,
      low: accumulator.low + (item.temperature === 'LOW' ? 1 : 0),
      medium: accumulator.medium + (item.temperature === 'MEDIUM' ? 1 : 0),
      high: accumulator.high + (item.temperature === 'HIGH' ? 1 : 0),
    }), {
      count: 0,
      amount: 0,
      low: 0,
      medium: 0,
      high: 0,
    }),
  }
}

export async function generateDre(filters: ReportingFilters): Promise<DreReport> {
  const dateField = filters.regime === 'CASH' ? 'paymentDate' : 'competenceDate'
  const statuses = filters.regime === 'CASH'
    ? ['PAID'] as const
    : ['OPEN', 'PAID'] as const

  const items = await prisma.financialEntry.findMany({
    where: {
      deletedAt: null,
      type: {
        not: 'TRANSFER',
      },
      status: {
        in: [...statuses],
      },
      [dateField]: {
        gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
        lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
      },
    },
    select: {
      direction: true,
      amount: true,
      category: {
        select: {
          id: true,
          name: true,
          dreGroup: true,
        },
      },
    },
  })

  const groups = buildDreGroups(items.map(item => ({
    categoryId: item.category?.id ?? null,
    categoryName: item.category?.name ?? null,
    dreGroup: item.category?.dreGroup ?? null,
    signedAmount: item.direction === 'INCOME'
      ? Number(item.amount)
      : -Number(item.amount),
  })))

  return {
    regime: filters.regime,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    groups,
    totals: groups.reduce((accumulator, group) => {
      const income = group.amount > 0 ? group.amount : 0
      const expense = group.amount < 0 ? Math.abs(group.amount) : 0

      return {
        income: accumulator.income + income,
        expense: accumulator.expense + expense,
        net: accumulator.net + group.amount,
      }
    }, {
      income: 0,
      expense: 0,
      net: 0,
    }),
  }
}

export async function generateFinancialDashboard(filters: ReportingFilters): Promise<FinancialDashboardData> {
  const [cashFlow, delinquency] = await Promise.all([
    generateCashFlow(filters),
    generateDelinquencyReport({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      referenceDate: filters.dateTo,
    }),
  ])

  return {
    regime: filters.regime,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    cashFlowTotals: cashFlow.totals,
    delinquencyTotals: delinquency.totals,
    cards: [
      {
        key: 'realized-net',
        title: 'Resultado realizado',
        value: cashFlow.totals.realizedNet,
        tone: cashFlow.totals.realizedNet >= 0 ? 'success' : 'danger',
      },
      {
        key: 'projected-net',
        title: 'Resultado previsto',
        value: cashFlow.totals.projectedNet,
        tone: cashFlow.totals.projectedNet >= 0 ? 'info' : 'warning',
      },
      {
        key: 'overdue-amount',
        title: 'Valor em atraso',
        value: delinquency.totals.amount,
        tone: delinquency.totals.amount > 0 ? 'danger' : 'neutral',
      },
      {
        key: 'overdue-count',
        title: 'Títulos em atraso',
        value: delinquency.totals.count,
        tone: delinquency.totals.count > 0 ? 'warning' : 'neutral',
      },
    ],
  }
}

export async function generateOperationalDashboard(filters: ReportingDateRangeFilters): Promise<OperationalDashboardData> {
  const [activeContracts, renewedContracts, lockedContracts, openEntries, paidEntries] = await Promise.all([
    prisma.contract.count({
      where: {
        deletedAt: null,
        status: {
          in: ['ACTIVE', 'RENEWED'],
        },
        startDate: {
          lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
        },
        OR: [
          { expectedEndDate: null },
          { expectedEndDate: { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } },
        ],
      },
    }),
    prisma.contract.count({
      where: {
        deletedAt: null,
        status: 'RENEWED',
        startDate: {
          gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
        },
      },
    }),
    prisma.contract.count({
      where: {
        deletedAt: null,
        status: 'LOCKED',
      },
    }),
    prisma.financialEntry.count({
      where: {
        deletedAt: null,
        status: 'OPEN',
        effectiveDueDate: {
          gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
        },
      },
    }),
    prisma.financialEntry.count({
      where: {
        deletedAt: null,
        status: 'PAID',
        paymentDate: {
          gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
        },
      },
    }),
  ])

  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    cards: [
      {
        key: 'active-contracts',
        title: 'Contratos ativos',
        value: activeContracts,
        tone: 'success',
      },
      {
        key: 'renewed-contracts',
        title: 'Renovações no período',
        value: renewedContracts,
        tone: 'info',
      },
      {
        key: 'locked-contracts',
        title: 'Contratos trancados',
        value: lockedContracts,
        tone: lockedContracts > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'open-entries',
        title: 'Lançamentos em aberto',
        value: openEntries,
        tone: openEntries > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'paid-entries',
        title: 'Lançamentos pagos',
        value: paidEntries,
        tone: 'success',
      },
    ],
  }
}

export async function generateContractsReport(filters: ReportingDateRangeFilters): Promise<ContractsReport> {
  const items = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      startDate: {
        lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
      },
      OR: [
        { expectedEndDate: null },
        { expectedEndDate: { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      expectedEndDate: true,
      finalAmount: true,
      client: {
        select: {
          name: true,
        },
      },
      renewalOf: {
        select: {
          title: true,
        },
      },
      renewedBy: {
        select: {
          id: true,
        },
      },
      entries: {
        select: {
          id: true,
        },
      },
    },
    orderBy: [
      { startDate: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  const normalizedItems = items.map(item => ({
    id: item.id,
    title: item.title,
    clientName: item.client.name,
    status: item.status,
    startDate: formatDateOnly(item.startDate),
    expectedEndDate: item.expectedEndDate ? formatDateOnly(item.expectedEndDate) : null,
    finalAmount: Number(item.finalAmount),
    entriesCount: item.entries.length,
    renewedByCount: item.renewedBy.length,
    renewalOfTitle: item.renewalOf?.title ?? null,
  } satisfies ContractsReportItem))

  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    items: normalizedItems,
    totals: normalizedItems.reduce((accumulator, item) => ({
      total: accumulator.total + 1,
      active: accumulator.active + (item.status === 'ACTIVE' ? 1 : 0),
      renewed: accumulator.renewed + (item.status === 'RENEWED' ? 1 : 0),
      locked: accumulator.locked + (item.status === 'LOCKED' ? 1 : 0),
      canceled: accumulator.canceled + (item.status === 'CANCELED' ? 1 : 0),
      closed: accumulator.closed + (item.status === 'CLOSED' ? 1 : 0),
      proposals: accumulator.proposals + (item.status === 'PROPOSAL' ? 1 : 0),
      drafts: accumulator.drafts + (item.status === 'DRAFT' ? 1 : 0),
    }), {
      total: 0,
      active: 0,
      renewed: 0,
      locked: 0,
      canceled: 0,
      closed: 0,
      proposals: 0,
      drafts: 0,
    }),
  }
}
