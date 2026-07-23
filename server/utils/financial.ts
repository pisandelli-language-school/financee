import type { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { randomUUID } from 'node:crypto'
import type {
  EntryDirection,
  EntryType,
  FinancialEntryCreatePayload,
  FinancialEntryFilters,
  FinancialEntryPaymentPayload,
  FinancialEntryRecord,
  FinancialEntryScopePayload,
  FinancialEntryUpdatePayload,
  FinancialEntryUpdateRequest,
  ManualEntryType,
  RecurrenceEditScope,
  RecurrenceFrequency,
  RecurrenceType,
} from '~~/app/types/financial'
import { resolveEffectiveDueDate } from '~~/server/utils/financial-calendar'
import { prisma } from '~~/server/utils/prisma'

const financialEntryInclude = {
  account: {
    include: {
      institution: true,
    },
  },
  paymentAccount: {
    include: {
      institution: true,
    },
  },
  paymentMethod: true,
  category: true,
  subcategory: true,
  costCenter: true,
  contact: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.FinancialEntryInclude

type FinancialEntryWithRelations = Prisma.FinancialEntryGetPayload<{
  include: typeof financialEntryInclude
}>

const entryDirectionSet = new Set<EntryDirection>(['INCOME', 'EXPENSE'])
const entryTypeSet = new Set<EntryType>(['NORMAL', 'ESTORNO', 'AJUSTE', 'TRANSFER'])
const manualEntryTypeSet = new Set<ManualEntryType>(['NORMAL', 'ESTORNO', 'AJUSTE'])
const recurrenceTypeSet = new Set<RecurrenceType>(['ONE_TIME', 'FIXED', 'INSTALLMENT'])
const recurrenceFrequencySet = new Set<RecurrenceFrequency>([
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL',
])
const recurrenceEditScopeSet = new Set<RecurrenceEditScope>(['ONLY_THIS', 'THIS_AND_NEXT', 'ALL'])
const DEFAULT_INDEFINITE_RECURRENCE_OCCURRENCES = 12

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalString(value: unknown) {
  const normalized = normalizeString(value)
  return normalized || null
}

function parsePage(value: unknown) {
  return Math.max(1, Number(value ?? 1) || 1)
}

function parsePageSize(value: unknown) {
  const parsed = Number(value ?? 50)

  if (!Number.isFinite(parsed)) {
    return 50
  }

  if (parsed <= 0) {
    return 0
  }

  return Math.max(1, Math.min(200, parsed))
}

function parseDateRange(value: string, boundary: 'start' | 'end') {
  if (!value) {
    return null
  }

  const normalized = boundary === 'start'
    ? `${value}T00:00:00.000Z`
    : `${value}T23:59:59.999Z`
  const parsed = new Date(normalized)

  return Number.isNaN(parsed.valueOf()) ? null : parsed
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

function parsePositiveAmount(value: string) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Informe um valor maior que zero.',
    })
  }

  return parsed
}

function parseDirection(value: string): EntryDirection {
  if (!entryDirectionSet.has(value as EntryDirection)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma direção válida.',
    })
  }

  return value as EntryDirection
}

function parseManualType(value: string): ManualEntryType {
  if (!manualEntryTypeSet.has(value as ManualEntryType)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione um tipo válido para o lançamento.',
    })
  }

  return value as ManualEntryType
}

function parseEntryType(value: string): EntryType {
  if (!entryTypeSet.has(value as EntryType)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione um tipo válido para o lançamento.',
    })
  }

  return value as EntryType
}

function parseRecurrenceType(value: string): RecurrenceType {
  const normalized = normalizeString(value) || 'ONE_TIME'

  if (!recurrenceTypeSet.has(normalized as RecurrenceType)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma repetição válida.',
    })
  }

  return normalized as RecurrenceType
}

function parseRecurrenceFrequency(value: string): RecurrenceFrequency {
  const normalized = normalizeString(value)

  if (!recurrenceFrequencySet.has(normalized as RecurrenceFrequency)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma frequência válida.',
    })
  }

  return normalized as RecurrenceFrequency
}

function parseRecurrenceTotal(value: string, recurrenceType: RecurrenceType) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 120) {
    throw createError({
      statusCode: 400,
      message: recurrenceType === 'INSTALLMENT'
        ? 'Informe um número de parcelas entre 2 e 120.'
        : 'Informe um número de ocorrências entre 2 e 120.',
    })
  }

  return parsed
}

function parseOptionalRecurrenceTotal(value: string, recurrenceType: RecurrenceType) {
  const normalized = normalizeString(value)

  if (recurrenceType === 'FIXED' && !normalized) {
    return null
  }

  return parseRecurrenceTotal(normalized, recurrenceType)
}

function parseRecurrenceEditScope(value: unknown): RecurrenceEditScope {
  const normalized = normalizeString(value) || 'ONLY_THIS'

  if (!recurrenceEditScopeSet.has(normalized as RecurrenceEditScope)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione um escopo válido para a série.',
    })
  }

  return normalized as RecurrenceEditScope
}

function toFinancialEntryRecord(entry: FinancialEntryWithRelations): FinancialEntryRecord {
  return {
    id: entry.id,
    direction: entry.direction,
    type: entry.type,
    status: entry.status,
    description: entry.description,
    amount: Number(entry.amount),
    competenceDate: entry.competenceDate.toISOString().slice(0, 10),
    scheduledDueDate: entry.scheduledDueDate.toISOString().slice(0, 10),
    effectiveDueDate: entry.effectiveDueDate.toISOString().slice(0, 10),
    paymentDate: entry.paymentDate ? entry.paymentDate.toISOString().slice(0, 10) : null,
    accountId: entry.accountId,
    accountName: entry.account.name,
    accountInstitutionName: entry.account.institution?.name ?? null,
    accountInstitutionLogoKey: entry.account.institution?.logoKey ?? null,
    paymentAccountId: entry.paymentAccountId,
    paymentAccountName: entry.paymentAccount?.name ?? null,
    paymentAccountInstitutionName: entry.paymentAccount?.institution?.name ?? null,
    paymentAccountInstitutionLogoKey: entry.paymentAccount?.institution?.logoKey ?? null,
    paymentMethodId: entry.paymentMethodId,
    paymentMethodName: entry.paymentMethod?.name ?? null,
    categoryId: entry.categoryId,
    categoryName: entry.category?.name ?? null,
    subcategoryId: entry.subcategoryId,
    subcategoryName: entry.subcategory?.name ?? null,
    costCenterId: entry.costCenterId,
    costCenterName: entry.costCenter?.name ?? null,
    contactId: entry.contactId,
    contactName: entry.contact?.name ?? null,
    tagIds: entry.tags.map(item => item.tagId),
    tagNames: entry.tags.map(item => item.tag.name),
    recurrenceType: entry.recurrenceType,
    recurrenceFrequency: entry.recurrenceFrequency,
    recurrenceGroupId: entry.recurrenceGroupId,
    recurrenceIndex: entry.recurrenceIndex,
    recurrenceTotal: entry.recurrenceTotal,
    notes: entry.notes ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

export function parseFinancialEntryFilters(event: H3Event): FinancialEntryFilters {
  const query = getQuery(event)

  return {
    search: normalizeString(query.search),
    direction: normalizeString(query.direction) as FinancialEntryFilters['direction'],
    status: normalizeString(query.status) as FinancialEntryFilters['status'],
    accountId: normalizeString(query.accountId),
    paymentMethodId: normalizeString(query.paymentMethodId),
    categoryId: normalizeString(query.categoryId),
    contactId: normalizeString(query.contactId),
    tagId: normalizeString(query.tagId),
    dateFrom: normalizeString(query.dateFrom),
    dateTo: normalizeString(query.dateTo),
    page: parsePage(query.page),
    pageSize: parsePageSize(query.pageSize),
  }
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function addMonths(date: Date, monthOffset: number) {
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + monthOffset
  const year = Math.floor(totalMonths / 12)
  const month = ((totalMonths % 12) + 12) % 12
  const day = date.getUTCDate()
  const targetDay = Math.min(day, getLastDayOfMonth(year, month))

  return new Date(Date.UTC(year, month, targetDay))
}

function addDays(date: Date, dayOffset: number) {
  const nextDate = new Date(date)

  nextDate.setUTCDate(nextDate.getUTCDate() + dayOffset)

  return nextDate
}

function addRecurrenceOffset(date: Date, frequency: RecurrenceFrequency, index: number) {
  if (index === 0) {
    return date
  }

  if (frequency === 'WEEKLY') {
    return addDays(date, index * 7)
  }

  if (frequency === 'BIWEEKLY') {
    return addDays(date, index * 14)
  }

  if (frequency === 'QUARTERLY') {
    return addMonths(date, index * 3)
  }

  if (frequency === 'SEMIANNUAL') {
    return addMonths(date, index * 6)
  }

  if (frequency === 'ANNUAL') {
    return addMonths(date, index * 12)
  }

  return addMonths(date, index)
}

function resolveRecurrenceInput(payload: FinancialEntryCreatePayload, type: EntryType) {
  if (type === 'TRANSFER') {
    return {
      recurrenceType: 'ONE_TIME' as const,
      recurrenceFrequency: null,
      recurrenceTotal: null,
      occurrenceCount: 1,
    }
  }

  const recurrenceType = parseRecurrenceType(payload.recurrenceType)

  if (recurrenceType === 'ONE_TIME') {
    return {
      recurrenceType,
      recurrenceFrequency: null,
      recurrenceTotal: null,
      occurrenceCount: 1,
    }
  }

  const recurrenceFrequency = parseRecurrenceFrequency(payload.recurrenceFrequency)
  const recurrenceTotal = parseOptionalRecurrenceTotal(payload.recurrenceTotal, recurrenceType)

  return {
    recurrenceType,
    recurrenceFrequency,
    recurrenceTotal,
    occurrenceCount: recurrenceTotal ?? DEFAULT_INDEFINITE_RECURRENCE_OCCURRENCES,
  }
}

export async function listFinancialEntries(filters: FinancialEntryFilters) {
  const where = buildFinancialEntryWhere(filters)

  const itemsPromise = filters.pageSize === 0
    ? prisma.financialEntry.findMany({
        where,
        include: financialEntryInclude,
        orderBy: [
          { effectiveDueDate: 'desc' },
          { createdAt: 'desc' },
        ],
      })
    : prisma.financialEntry.findMany({
        where,
        include: financialEntryInclude,
        orderBy: [
          { effectiveDueDate: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      })

  const [items, total, summaryGroups] = await Promise.all([
    itemsPromise,
    prisma.financialEntry.count({ where }),
    summarizeFinancialEntries(filters),
  ])

  return {
    items: items.map(item => toFinancialEntryRecord(item)),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: summaryGroups,
  }
}

export async function summarizeFinancialEntries(filters: FinancialEntryFilters) {
  const summaryGroups = await prisma.financialEntry.groupBy({
    by: ['direction'],
    where: buildFinancialEntryWhere(filters),
    _sum: {
      amount: true,
    },
  })

  const income = summaryGroups.find(group => group.direction === 'INCOME')?._sum.amount?.toNumber() ?? 0
  const expense = summaryGroups.find(group => group.direction === 'EXPENSE')?._sum.amount?.toNumber() ?? 0

  return {
    income,
    expense,
    net: income - expense,
  }
}

function buildFinancialEntryWhere(filters: FinancialEntryFilters): Prisma.FinancialEntryWhereInput {
  const dateFrom = parseDateRange(filters.dateFrom, 'start')
  const dateTo = parseDateRange(filters.dateTo, 'end')

  return {
    deletedAt: null,
    ...(filters.direction ? { direction: filters.direction } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.paymentMethodId ? { paymentMethodId: filters.paymentMethodId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.contactId ? { contactId: filters.contactId } : {}),
    ...(filters.tagId ? { tags: { some: { tagId: filters.tagId } } } : {}),
    ...((dateFrom || dateTo)
      ? {
          effectiveDueDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { description: { contains: filters.search } },
            { account: { name: { contains: filters.search } } },
            { category: { name: { contains: filters.search } } },
            { contact: { name: { contains: filters.search } } },
            { tags: { some: { tag: { name: { contains: filters.search } } } } },
          ],
        }
      : {}),
  }
}

export async function getFinancialEntry(id: string) {
  const entry = await prisma.financialEntry.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: financialEntryInclude,
  })

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  return toFinancialEntryRecord(entry)
}

export async function createFinancialEntry(payload: FinancialEntryCreatePayload) {
  const type = parseEntryType(payload.type)

  if (type === 'TRANSFER') {
    return await createFinancialTransfer(payload)
  }

  const { tagIds, ...entryData } = await resolveFinancialEntryInput(payload)
  const recurrence = resolveRecurrenceInput(payload, type)

  if (recurrence.occurrenceCount > 1 && recurrence.recurrenceFrequency) {
    const recurrenceGroupId = randomUUID()
    const occurrenceIndexes = Array.from({ length: recurrence.occurrenceCount }, (_, index) => index)
    const occurrenceData = await Promise.all(occurrenceIndexes.map(async (index) => {
      const competenceDate = addRecurrenceOffset(entryData.competenceDate, recurrence.recurrenceFrequency, index)
      const scheduledDueDate = addRecurrenceOffset(entryData.scheduledDueDate, recurrence.recurrenceFrequency, index)

      return {
        ...entryData,
        competenceDate,
        scheduledDueDate,
        effectiveDueDate: await resolveEffectiveDueDate(scheduledDueDate),
        status: 'OPEN' as const,
        recurrenceType: recurrence.recurrenceType,
        recurrenceFrequency: recurrence.recurrenceFrequency,
        recurrenceGroupId,
        recurrenceIndex: index + 1,
        recurrenceTotal: recurrence.recurrenceTotal,
      }
    }))

    const firstRecord = await prisma.$transaction(async (transaction) => {
      let firstEntry: FinancialEntryWithRelations | null = null

      for (const data of occurrenceData) {
        const record = await transaction.financialEntry.create({
          data: {
            ...data,
            tags: {
              create: tagIds.map(tagId => ({
                tagId,
              })),
            },
          },
          include: financialEntryInclude,
        })

        firstEntry ??= record
      }

      return firstEntry
    })

    if (!firstRecord) {
      throw createError({
        statusCode: 500,
        message: 'Não foi possível criar a série de lançamentos.',
      })
    }

    return toFinancialEntryRecord(firstRecord)
  }

  const record = await prisma.financialEntry.create({
    data: {
      ...entryData,
      status: 'OPEN',
      recurrenceType: 'ONE_TIME',
      recurrenceFrequency: null,
      recurrenceGroupId: null,
      recurrenceIndex: null,
      recurrenceTotal: null,
      tags: {
        create: tagIds.map(tagId => ({
          tagId,
        })),
      },
    },
    include: financialEntryInclude,
  })

  return toFinancialEntryRecord(record)
}

async function createFinancialTransfer(payload: FinancialEntryCreatePayload) {
  const description = normalizeString(payload.description)
  const amount = parsePositiveAmount(payload.amount)
  const competenceDate = parseDateOnly(payload.competenceDate, 'Competência')
  const scheduledDueDate = parseDateOnly(payload.scheduledDueDate, 'Vencimento')
  const originAccountId = normalizeString(payload.accountId)
  const targetAccountId = normalizeString(payload.transferTargetAccountId)
  const notes = optionalString(payload.notes)

  if (!description) {
    throw createError({
      statusCode: 400,
      message: 'Descrição é obrigatória.',
    })
  }

  if (!originAccountId) {
    throw createError({
      statusCode: 400,
      message: 'Selecione a conta de origem.',
    })
  }

  if (!targetAccountId) {
    throw createError({
      statusCode: 400,
      message: 'Selecione a conta de destino.',
    })
  }

  if (originAccountId === targetAccountId) {
    throw createError({
      statusCode: 400,
      message: 'A conta de destino deve ser diferente da origem.',
    })
  }

  const [originAccount, targetAccount, effectiveDueDate] = await Promise.all([
    prisma.account.findFirst({
      where: {
        id: originAccountId,
        deletedAt: null,
        isActive: true,
      },
    }),
    prisma.account.findFirst({
      where: {
        id: targetAccountId,
        deletedAt: null,
        isActive: true,
      },
    }),
    resolveEffectiveDueDate(scheduledDueDate),
  ])

  if (!originAccount) {
    throw createError({
      statusCode: 400,
      message: 'Conta de origem não encontrada.',
    })
  }

  if (!targetAccount) {
    throw createError({
      statusCode: 400,
      message: 'Conta de destino não encontrada.',
    })
  }

  const transferGroupId = randomUUID()

  const records = await prisma.$transaction(async (transaction) => {
    const baseData = {
      type: 'TRANSFER' as const,
      status: 'OPEN' as const,
      description,
      amount,
      competenceDate,
      scheduledDueDate,
      effectiveDueDate,
      recurrenceType: 'ONE_TIME' as const,
      transferGroupId,
      notes,
    }

    const expense = await transaction.financialEntry.create({
      data: {
        ...baseData,
        direction: 'EXPENSE',
        accountId: originAccount.id,
      },
      include: financialEntryInclude,
    })

    await transaction.financialEntry.create({
      data: {
        ...baseData,
        direction: 'INCOME',
        accountId: targetAccount.id,
      },
      include: financialEntryInclude,
    })

    return expense
  })

  return toFinancialEntryRecord(records)
}

export async function updateFinancialEntry(id: string, payload: FinancialEntryUpdateRequest) {
  const currentEntry = await prisma.financialEntry.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  })

  if (!currentEntry) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  if (currentEntry.type === 'TRANSFER' || currentEntry.transferGroupId) {
    throw createError({
      statusCode: 400,
      message: 'Transferências serão editadas em um fluxo próprio.',
    })
  }

  const { tagIds, ...entryData } = await resolveFinancialEntryInput(payload)
  const scope = parseRecurrenceEditScope(payload.scope)

  if (!currentEntry.recurrenceGroupId || scope === 'ONLY_THIS') {
    const record = await prisma.financialEntry.update({
      where: {
        id,
      },
      data: {
        ...entryData,
        recurrenceType: currentEntry.recurrenceType,
        recurrenceFrequency: currentEntry.recurrenceFrequency,
        recurrenceGroupId: currentEntry.recurrenceGroupId,
        recurrenceIndex: currentEntry.recurrenceIndex,
        recurrenceTotal: currentEntry.recurrenceTotal,
        tags: {
          deleteMany: {},
          create: tagIds.map(tagId => ({
            tagId,
          })),
        },
      },
      include: financialEntryInclude,
    })

    return toFinancialEntryRecord(record)
  }

  if (!currentEntry.recurrenceFrequency || !currentEntry.recurrenceIndex) {
    throw createError({
      statusCode: 400,
      message: 'A série deste lançamento não possui dados suficientes para edição em lote.',
    })
  }

  const currentRecurrenceFrequency = currentEntry.recurrenceFrequency
  const currentRecurrenceIndex = currentEntry.recurrenceIndex

  const targetWhere: Prisma.FinancialEntryWhereInput = {
    recurrenceGroupId: currentEntry.recurrenceGroupId,
    deletedAt: null,
    ...(scope === 'THIS_AND_NEXT'
      ? {
          recurrenceIndex: {
            gte: currentRecurrenceIndex,
          },
        }
      : {}),
  }

  const targets = await prisma.financialEntry.findMany({
    where: targetWhere,
    orderBy: {
      recurrenceIndex: 'asc',
    },
  })

  if (!targets.length) {
    throw createError({
      statusCode: 404,
      message: 'Nenhuma ocorrência da série foi encontrada.',
    })
  }

  const updatedRecord = await prisma.$transaction(async (transaction) => {
    let selectedRecord: FinancialEntryWithRelations | null = null

    for (const target of targets) {
      if (target.type === 'TRANSFER' || target.transferGroupId) {
        throw createError({
          statusCode: 400,
          message: 'Transferências serão editadas em um fluxo próprio.',
        })
      }

      const occurrenceOffset = (target.recurrenceIndex ?? currentRecurrenceIndex) - currentRecurrenceIndex
      const competenceDate = addRecurrenceOffset(entryData.competenceDate, currentRecurrenceFrequency, occurrenceOffset)
      const scheduledDueDate = addRecurrenceOffset(entryData.scheduledDueDate, currentRecurrenceFrequency, occurrenceOffset)
      const effectiveDueDate = await resolveEffectiveDueDate(scheduledDueDate)

      const record = await transaction.financialEntry.update({
        where: {
          id: target.id,
        },
        data: {
          ...entryData,
          competenceDate,
          scheduledDueDate,
          effectiveDueDate,
          recurrenceType: target.recurrenceType,
          recurrenceFrequency: target.recurrenceFrequency,
          recurrenceGroupId: target.recurrenceGroupId,
          recurrenceIndex: target.recurrenceIndex,
          recurrenceTotal: target.recurrenceTotal,
          tags: {
            deleteMany: {},
            create: tagIds.map(tagId => ({
              tagId,
            })),
          },
        },
        include: financialEntryInclude,
      })

      if (target.id === id) {
        selectedRecord = record
      }
    }

    return selectedRecord
  })

  if (!updatedRecord) {
    return await getFinancialEntry(id)
  }

  return toFinancialEntryRecord(updatedRecord)
}

export async function markFinancialEntryAsPaid(id: string, payload: FinancialEntryPaymentPayload) {
  const currentEntry = await getWritableFinancialEntry(id)
  const paymentDate = parseDateOnly(payload.paymentDate, 'Data de pagamento')

  if (currentEntry.status === 'CANCELED') {
    throw createError({
      statusCode: 400,
      message: 'Não é possível pagar um lançamento cancelado.',
    })
  }

  if (currentEntry.transferGroupId) {
    const records = await prisma.financialEntry.findMany({
      where: {
        transferGroupId: currentEntry.transferGroupId,
        deletedAt: null,
      },
    })

    if (records.some(record => record.status === 'CANCELED')) {
      throw createError({
        statusCode: 400,
        message: 'Não é possível pagar uma transferência cancelada.',
      })
    }

    await prisma.$transaction(records.map(record => prisma.financialEntry.update({
      where: {
        id: record.id,
      },
      data: {
        status: 'PAID',
        paymentDate,
        paymentAccountId: record.accountId,
      },
    })))

    return await getFinancialEntry(id)
  }

  const paymentAccountId = normalizeString(payload.paymentAccountId) || currentEntry.accountId
  const paymentAccount = await prisma.account.findFirst({
    where: {
      id: paymentAccountId,
      deletedAt: null,
      isActive: true,
    },
  })

  if (!paymentAccount) {
    throw createError({
      statusCode: 400,
      message: 'Conta de pagamento não encontrada.',
    })
  }

  const record = await prisma.financialEntry.update({
    where: {
      id,
    },
    data: {
      status: 'PAID',
      paymentDate,
      paymentAccountId: paymentAccount.id,
    },
    include: financialEntryInclude,
  })

  return toFinancialEntryRecord(record)
}

export async function markFinancialEntryAsOpen(id: string) {
  const currentEntry = await getWritableFinancialEntry(id)

  if (currentEntry.status === 'CANCELED') {
    throw createError({
      statusCode: 400,
      message: 'Não é possível reabrir um lançamento cancelado neste fluxo.',
    })
  }

  if (currentEntry.transferGroupId) {
    await prisma.financialEntry.updateMany({
      where: {
        transferGroupId: currentEntry.transferGroupId,
        deletedAt: null,
      },
      data: {
        status: 'OPEN',
        paymentDate: null,
        paymentAccountId: null,
      },
    })

    return await getFinancialEntry(id)
  }

  const record = await prisma.financialEntry.update({
    where: {
      id,
    },
    data: {
      status: 'OPEN',
      paymentDate: null,
      paymentAccountId: null,
    },
    include: financialEntryInclude,
  })

  return toFinancialEntryRecord(record)
}

export async function cancelFinancialEntry(id: string, payload: FinancialEntryScopePayload = {}) {
  const entry = await getWritableFinancialEntry(id)
  const scope = parseRecurrenceEditScope(payload.scope)

  if (entry.transferGroupId) {
    await prisma.financialEntry.updateMany({
      where: {
        transferGroupId: entry.transferGroupId,
        deletedAt: null,
      },
      data: {
        status: 'CANCELED',
        paymentDate: null,
        paymentAccountId: null,
      },
    })

    return await getFinancialEntry(id)
  }

  if (!entry.recurrenceGroupId || scope === 'ONLY_THIS') {
    const record = await prisma.financialEntry.update({
      where: {
        id,
      },
      data: {
        status: 'CANCELED',
        paymentDate: null,
        paymentAccountId: null,
      },
      include: financialEntryInclude,
    })

    return toFinancialEntryRecord(record)
  }

  if (!entry.recurrenceIndex) {
    throw createError({
      statusCode: 400,
      message: 'A série deste lançamento não possui dados suficientes para cancelamento em lote.',
    })
  }

  const targetWhere: Prisma.FinancialEntryWhereInput = {
    recurrenceGroupId: entry.recurrenceGroupId,
    deletedAt: null,
    ...(scope === 'THIS_AND_NEXT'
      ? {
          recurrenceIndex: {
            gte: entry.recurrenceIndex,
          },
        }
      : {}),
  }

  await prisma.financialEntry.updateMany({
    where: targetWhere,
    data: {
      status: 'CANCELED',
      paymentDate: null,
      paymentAccountId: null,
    },
  })

  return await getFinancialEntry(id)
}

export async function deleteFinancialEntry(id: string) {
  const entry = await prisma.financialEntry.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  })

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  if (
    entry.status !== 'OPEN'
    || entry.paymentDate
    || entry.paymentAccountId
    || entry.transferGroupId
    || entry.recurrenceGroupId
    || entry.contractId
  ) {
    throw createError({
      statusCode: 400,
      message: 'Este lançamento possui vínculos ou movimentação financeira. Use cancelar para removê-lo do fluxo.',
    })
  }

  await prisma.financialEntry.update({
    where: {
      id,
    },
    data: {
      deletedAt: new Date(),
    },
  })
}

async function getWritableFinancialEntry(id: string) {
  const entry = await prisma.financialEntry.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  })

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Lançamento não encontrado.',
    })
  }

  return entry
}

async function resolveFinancialEntryInput(payload: FinancialEntryCreatePayload | FinancialEntryUpdatePayload) {
  const direction = parseDirection(payload.direction)
  const type = parseManualType(payload.type)
  const description = normalizeString(payload.description)
  const amount = parsePositiveAmount(payload.amount)
  const competenceDate = parseDateOnly(payload.competenceDate, 'Competência')
  const scheduledDueDate = parseDateOnly(payload.scheduledDueDate, 'Vencimento')
  const categoryId = normalizeString(payload.categoryId)
  const subcategoryId = normalizeString(payload.subcategoryId)
  const costCenterId = normalizeString(payload.costCenterId)
  const contactId = normalizeString(payload.contactId)
  const paymentMethodId = normalizeString(payload.paymentMethodId)
  const tagIds = normalizeTagIds(payload.tagIds)
  const notes = optionalString(payload.notes)

  if (!description) {
    throw createError({
      statusCode: 400,
      message: 'Descrição é obrigatória.',
    })
  }

  if (!payload.accountId) {
    throw createError({
      statusCode: 400,
      message: 'Selecione a conta prevista.',
    })
  }

  if (!categoryId) {
    throw createError({
      statusCode: 400,
      message: 'Selecione a categoria.',
    })
  }

  const [account, category, subcategory, costCenter, contact, paymentMethod, tags, effectiveDueDate] = await Promise.all([
    prisma.account.findFirst({
      where: {
        id: payload.accountId,
        deletedAt: null,
        isActive: true,
      },
    }),
    prisma.category.findFirst({
      where: {
        id: categoryId,
        deletedAt: null,
        isActive: true,
      },
    }),
    subcategoryId
      ? prisma.category.findFirst({
          where: {
            id: subcategoryId,
            deletedAt: null,
            isActive: true,
          },
        })
      : Promise.resolve(null),
    costCenterId
      ? prisma.costCenter.findFirst({
          where: {
            id: costCenterId,
            deletedAt: null,
            isActive: true,
          },
        })
      : Promise.resolve(null),
    contactId
      ? prisma.contact.findFirst({
          where: {
            id: contactId,
            deletedAt: null,
            isActive: true,
          },
          include: {
            roleAssignments: true,
          },
        })
      : Promise.resolve(null),
    paymentMethodId
      ? prisma.paymentMethod.findFirst({
          where: {
            id: paymentMethodId,
            deletedAt: null,
            isActive: true,
          },
        })
      : Promise.resolve(null),
    tagIds.length
      ? prisma.tag.findMany({
          where: {
            id: {
              in: tagIds,
            },
            deletedAt: null,
            isActive: true,
          },
        })
      : Promise.resolve([]),
    resolveEffectiveDueDate(scheduledDueDate),
  ])

  if (!account) {
    throw createError({
      statusCode: 400,
      message: 'Conta prevista não encontrada.',
    })
  }

  if (!category) {
    throw createError({
      statusCode: 400,
      message: 'Categoria não encontrada.',
    })
  }

  if (category.parentId) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma categoria principal.',
    })
  }

  if (category.type !== direction) {
    throw createError({
      statusCode: 400,
      message: 'A categoria deve ser compatível com a direção do lançamento.',
    })
  }

  if (subcategoryId) {
    if (!subcategory) {
      throw createError({
        statusCode: 400,
        message: 'Subcategoria não encontrada.',
      })
    }

    if (subcategory.parentId !== category.id || subcategory.type !== direction) {
      throw createError({
        statusCode: 400,
        message: 'A subcategoria deve pertencer à categoria selecionada.',
      })
    }
  }

  if (costCenterId && !costCenter) {
    throw createError({
      statusCode: 400,
      message: 'Centro de custo não encontrado.',
    })
  }

  if (paymentMethodId && !paymentMethod) {
    throw createError({
      statusCode: 400,
      message: 'Forma de pagamento não encontrada.',
    })
  }

  if (contactId) {
    if (!contact) {
      throw createError({
        statusCode: 400,
        message: 'Contato não encontrado.',
      })
    }

    const requiredRole = direction === 'INCOME' ? 'CLIENT' : 'SUPPLIER'

    if (!contact.roleAssignments.some((assignment) => assignment.role === requiredRole)) {
      throw createError({
        statusCode: 400,
        message: direction === 'INCOME'
          ? 'Para entradas, selecione um contato classificado como cliente.'
          : 'Para saídas, selecione um contato classificado como fornecedor.',
      })
    }
  }

  if (tags.length !== tagIds.length) {
    throw createError({
      statusCode: 400,
      message: 'Uma ou mais tags selecionadas não foram encontradas.',
    })
  }

  return {
    direction,
    type,
    description,
    amount,
    competenceDate,
    scheduledDueDate,
    effectiveDueDate,
    accountId: account.id,
    paymentMethodId: paymentMethod?.id ?? null,
    categoryId: category.id,
    subcategoryId: subcategory?.id ?? null,
    costCenterId: costCenter?.id ?? null,
    contactId: contact?.id ?? null,
    tagIds,
    notes,
  }
}

function normalizeTagIds(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.map(item => normalizeString(item)).filter(Boolean))]
}
