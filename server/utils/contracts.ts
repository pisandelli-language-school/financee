import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import type {
  ContractBillingFrequency,
  ContractBillingModel,
  ContractFilters,
  ContractFormValues,
  ContractGenerationFormValues,
  ContractGenerationResponse,
  ContractHistoryRecord,
  ContractRecord,
  ContractStatus,
} from '~~/app/types/contracts'
import { resolveEffectiveDueDate } from '~~/server/utils/financial-calendar'
import { prisma } from '~~/server/utils/prisma'

const contractStatusSet = new Set<ContractStatus>([
  'DRAFT',
  'PROPOSAL',
  'ACTIVE',
  'RENEWED',
  'CLOSED',
  'CANCELED',
  'LOCKED',
])

const contractBillingModelSet = new Set<ContractBillingModel>([
  'CASH',
  'INSTALLMENT',
  'RECURRING',
])

const contractBillingFrequencySet = new Set<ContractBillingFrequency>([
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL',
])

const contractInclude = {
  client: true,
  paymentCondition: true,
  renewalOf: true,
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
} satisfies Prisma.ContractInclude

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: typeof contractInclude
}>

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

function parseDateOnly(value: unknown, fieldLabel: string) {
  const normalized = normalizeString(value)

  if (!normalized) {
    return null
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

function parseRequiredDate(value: unknown, fieldLabel: string) {
  const parsed = parseDateOnly(value, fieldLabel)

  if (!parsed) {
    throw createError({
      statusCode: 400,
      message: `${fieldLabel} é obrigatório.`,
    })
  }

  return parsed
}

function parseDecimal(value: unknown, fieldLabel: string, { required = false } = {}) {
  const normalized = normalizeString(value)

  if (!normalized) {
    if (required) {
      throw createError({
        statusCode: 400,
        message: `${fieldLabel} é obrigatório.`,
      })
    }

    return null
  }

  const cleaned = normalized.replace(/[^\d,.-]/g, '')
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const decimalIndex = Math.max(lastComma, lastDot)
  const parsedValue = decimalIndex === -1
    ? cleaned.replace(/[.,]/g, '')
    : `${cleaned.slice(0, decimalIndex).replace(/[.,]/g, '')}.${cleaned.slice(decimalIndex + 1).replace(/[^\d]/g, '')}`
  const parsed = Number(parsedValue)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createError({
      statusCode: 400,
      message: `${fieldLabel} é inválido.`,
    })
  }

  return parsed
}

function parseOptionalFloat(value: unknown, fieldLabel: string) {
  const normalized = normalizeString(value)

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized.replace(',', '.'))

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createError({
      statusCode: 400,
      message: `${fieldLabel} é inválido.`,
    })
  }

  return parsed
}

function calculateFinalAmount(originalAmount: number, discountAmount: number | null) {
  return originalAmount * (1 - ((discountAmount ?? 0) / 100))
}

function parseStatus(value: unknown): ContractStatus {
  const normalized = normalizeString(value)

  if (!contractStatusSet.has(normalized as ContractStatus)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione um status válido.',
    })
  }

  return normalized as ContractStatus
}

function parseBillingModel(value: unknown): ContractBillingModel {
  const normalized = normalizeString(value)

  if (!contractBillingModelSet.has(normalized as ContractBillingModel)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma modalidade de cobrança válida.',
    })
  }

  return normalized as ContractBillingModel
}

function parseBillingFrequency(value: unknown, billingModel: ContractBillingModel) {
  if (billingModel === 'CASH') {
    return null
  }

  const normalized = normalizeString(value)

  if (!contractBillingFrequencySet.has(normalized as ContractBillingFrequency)) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma frequência de cobrança válida.',
    })
  }

  return normalized as ContractBillingFrequency
}

function parseBillingOccurrences(value: unknown, billingModel: ContractBillingModel) {
  if (billingModel === 'CASH') {
    return null
  }

  const parsed = Number(normalizeString(value))

  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 120) {
    throw createError({
      statusCode: 400,
      message: billingModel === 'INSTALLMENT'
        ? 'Informe um número de parcelas entre 2 e 120.'
        : 'Informe um número de recorrências entre 2 e 120.',
    })
  }

  return parsed
}

function addMonths(date: Date, monthOffset: number) {
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + monthOffset
  const year = Math.floor(totalMonths / 12)
  const month = ((totalMonths % 12) + 12) % 12
  const day = date.getUTCDate()
  const targetDay = Math.min(day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate())

  return new Date(Date.UTC(year, month, targetDay))
}

function addBillingOffset(date: Date, frequency: ContractBillingFrequency, index: number) {
  if (index === 0) {
    return date
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

function splitInstallments(total: number, count: number) {
  const totalInCents = Math.round(total * 100)
  const base = Math.floor(totalInCents / count)
  const remainder = totalInCents - (base * count)

  return Array.from({ length: count }, (_, index) => (base + (index === count - 1 ? remainder : 0)) / 100)
}

function parseGenerationText(value: unknown, label: string, { required = false } = {}) {
  const normalized = normalizeString(value)

  if (!normalized && required) {
    throw createError({
      statusCode: 400,
      message: `${label} é obrigatório.`,
    })
  }

  return normalized
}

function toContractRecord(record: ContractWithRelations): ContractRecord {
  return {
    id: record.id,
    title: record.title,
    clientId: record.clientId,
    clientName: record.client.name,
    status: record.status,
    originalAmount: Number(record.originalAmount),
    discountAmount: record.discountAmount == null ? null : Number(record.discountAmount),
    finalAmount: Number(record.finalAmount),
    totalHours: record.totalHours ?? null,
    weeklyHours: record.weeklyHours ?? null,
    startDate: record.startDate.toISOString().slice(0, 10),
    expectedEndDate: record.expectedEndDate ? record.expectedEndDate.toISOString().slice(0, 10) : null,
    billingModel: record.billingModel,
    billingFrequency: record.billingFrequency ?? null,
    billingOccurrences: record.billingOccurrences ?? null,
    firstDueDate: record.firstDueDate ? record.firstDueDate.toISOString().slice(0, 10) : null,
    paymentConditionId: record.paymentConditionId ?? null,
    paymentConditionName: record.paymentCondition?.name ?? null,
    notes: record.notes ?? null,
    externalContractId: record.externalContractId ?? null,
    source: record.source,
    renewalOfContractId: record.renewalOfContractId ?? null,
    renewalOfTitle: record.renewalOf?.title ?? null,
    renewedByCount: record.renewedBy.length,
    entriesCount: record.entries.length,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function parseContractFilters(event: H3Event): ContractFilters {
  const query = getQuery(event)

  return {
    search: normalizeString(query.search),
    status: normalizeString(query.status) as ContractFilters['status'],
    clientId: normalizeString(query.clientId),
    page: parsePage(query.page),
    pageSize: parsePageSize(query.pageSize),
  }
}

export async function listContracts(filters: ContractFilters) {
  const where: Prisma.ContractWhereInput = {
    deletedAt: null,
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search } },
            { client: { name: { contains: filters.search } } },
          ],
        }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      include: contractInclude,
      orderBy: [
        { startDate: 'desc' },
        { createdAt: 'desc' },
      ],
      ...(filters.pageSize > 0
        ? {
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
          }
        : {}),
    }),
  ])

  return {
    items: items.map(toContractRecord),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  }
}

export async function getContractById(id: string) {
  const record = await prisma.contract.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: contractInclude,
  })

  if (!record) {
    throw createError({
      statusCode: 404,
      message: 'Contrato não encontrado.',
    })
  }

  return toContractRecord(record)
}

async function ensureClientExists(clientId: string) {
  const client = await prisma.contact.findFirst({
    where: {
      id: clientId,
      deletedAt: null,
      isActive: true,
      roleAssignments: {
        some: {
          role: 'CLIENT',
        },
      },
    },
    select: {
      id: true,
    },
  })

  if (!client) {
    throw createError({
      statusCode: 400,
      message: 'Selecione um cliente válido.',
    })
  }
}

function buildContractInput(payload: ContractFormValues) {
  const title = normalizeString(payload.title)

  if (!title) {
    throw createError({
      statusCode: 400,
      message: 'Informe o título do contrato.',
    })
  }

  const clientId = normalizeString(payload.clientId)

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Selecione o cliente do contrato.',
    })
  }

  const originalAmount = parseDecimal(payload.originalAmount, 'Valor original', { required: true }) ?? 0
  const discountAmount = parseDecimal(payload.discountAmount, 'Desconto')
  const finalAmount = calculateFinalAmount(originalAmount, discountAmount)
  const billingModel = parseBillingModel(payload.billingModel)
  const billingFrequency = parseBillingFrequency(payload.billingFrequency, billingModel)
  const billingOccurrences = parseBillingOccurrences(payload.billingOccurrences, billingModel)

  if (discountAmount != null && discountAmount > 100) {
    throw createError({
      statusCode: 400,
      message: 'O desconto não pode ser maior que 100%.',
    })
  }
  const startDate = parseRequiredDate(payload.startDate, 'Data de início')
  const expectedEndDate = parseDateOnly(payload.expectedEndDate, 'Data prevista de término')
  const firstDueDate = parseDateOnly(payload.firstDueDate, 'Primeiro vencimento')

  if (expectedEndDate && expectedEndDate < startDate) {
    throw createError({
      statusCode: 400,
      message: 'A data prevista de término não pode ser anterior ao início.',
    })
  }

  if (billingModel !== 'CASH' && !firstDueDate) {
    throw createError({
      statusCode: 400,
      message: 'Informe o primeiro vencimento da cobrança.',
    })
  }

  return {
    title,
    clientId,
    status: parseStatus(payload.status),
    originalAmount,
    discountAmount,
    finalAmount,
    totalHours: parseOptionalFloat(payload.totalHours, 'Carga horária total'),
    weeklyHours: parseOptionalFloat(payload.weeklyHours, 'Carga horária semanal'),
    startDate,
    expectedEndDate,
    billingModel,
    billingFrequency,
    billingOccurrences,
    firstDueDate,
    paymentConditionId: null,
    notes: optionalString(payload.notes),
    externalContractId: optionalString(payload.externalContractId),
    source: 'LOCAL',
  } satisfies Prisma.ContractUncheckedCreateInput
}

export async function createContract(payload: ContractFormValues) {
  const input = buildContractInput(payload)
  await ensureClientExists(input.clientId)

  const record = await prisma.contract.create({
    data: input,
    include: contractInclude,
  })

  return toContractRecord(record)
}

export async function updateContract(id: string, payload: ContractFormValues) {
  await getContractById(id)

  const input = buildContractInput(payload)
  await ensureClientExists(input.clientId)

  const record = await prisma.contract.update({
    where: { id },
    data: input,
    include: contractInclude,
  })

  return toContractRecord(record)
}

export async function changeContractStatus(id: string, status: ContractStatus) {
  await getContractById(id)

  const record = await prisma.contract.update({
    where: { id },
    data: {
      status: parseStatus(status),
    },
    include: contractInclude,
  })

  return toContractRecord(record)
}

export async function renewContract(id: string, payload: ContractFormValues) {
  const existing = await prisma.contract.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      expectedEndDate: true,
    },
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Contrato não encontrado.',
    })
  }

  if (existing.status !== 'ACTIVE') {
    throw createError({
      statusCode: 400,
      message: 'Apenas contratos ativos podem ser renovados.',
    })
  }

  const input = buildContractInput(payload)
  await ensureClientExists(input.clientId)

  if (input.startDate <= existing.startDate) {
    throw createError({
      statusCode: 400,
      message: 'A renovação deve começar depois da data de início do contrato anterior.',
    })
  }

  if (existing.expectedEndDate && input.startDate <= existing.expectedEndDate) {
    throw createError({
      statusCode: 400,
      message: 'A renovação deve começar depois da data prevista de término do contrato anterior.',
    })
  }

  const record = await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id },
      data: {
        status: 'RENEWED',
      },
    })

    return await tx.contract.create({
      data: {
        ...input,
        renewalOfContractId: id,
      },
      include: contractInclude,
    })
  })

  return toContractRecord(record)
}

export async function getContractHistory(id: string) {
  const current = await prisma.contract.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      expectedEndDate: true,
      renewalOfContractId: true,
      renewedBy: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          expectedEndDate: true,
        },
        orderBy: [
          { startDate: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
  })

  if (!current) {
    throw createError({
      statusCode: 404,
      message: 'Contrato não encontrado.',
    })
  }

  const items: ContractHistoryRecord[] = []
  const previousChain: ContractHistoryRecord[] = []

  let previousId = current.renewalOfContractId

  while (previousId) {
    const previous = await prisma.contract.findFirst({
      where: {
        id: previousId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        expectedEndDate: true,
        renewalOfContractId: true,
      },
    })

    if (!previous) {
      break
    }

    previousChain.unshift({
      id: previous.id,
      title: previous.title,
      status: previous.status,
      startDate: previous.startDate.toISOString().slice(0, 10),
      expectedEndDate: previous.expectedEndDate ? previous.expectedEndDate.toISOString().slice(0, 10) : null,
      relation: 'PREVIOUS',
    })

    previousId = previous.renewalOfContractId
  }

  items.push(...previousChain)
  items.push({
    id: current.id,
    title: current.title,
    status: current.status,
    startDate: current.startDate.toISOString().slice(0, 10),
    expectedEndDate: current.expectedEndDate ? current.expectedEndDate.toISOString().slice(0, 10) : null,
    relation: 'CURRENT',
  })

  let nextCursorId = current.id

  while (true) {
    const next = await prisma.contract.findFirst({
      where: {
        renewalOfContractId: nextCursorId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        expectedEndDate: true,
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    if (!next) {
      break
    }

    items.push({
      id: next.id,
      title: next.title,
      status: next.status,
      startDate: next.startDate.toISOString().slice(0, 10),
      expectedEndDate: next.expectedEndDate ? next.expectedEndDate.toISOString().slice(0, 10) : null,
      relation: 'NEXT',
    })

    nextCursorId = next.id
  }

  return { items }
}

export async function generateContractEntries(id: string, payload: ContractGenerationFormValues): Promise<ContractGenerationResponse> {
  const contract = await prisma.contract.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      client: {
        include: {
          roleAssignments: true,
        },
      },
      entries: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
  })

  if (!contract) {
    throw createError({
      statusCode: 404,
      message: 'Contrato não encontrado.',
    })
  }

  if (contract.status !== 'ACTIVE') {
    throw createError({
      statusCode: 400,
      message: 'Só é possível gerar lançamentos para contratos ativos.',
    })
  }

  if (contract.entries.length) {
    throw createError({
      statusCode: 400,
      message: 'Este contrato já possui lançamentos vinculados.',
    })
  }

  if (!contract.client.isActive || !contract.client.roleAssignments.some(assignment => assignment.role === 'CLIENT')) {
    throw createError({
      statusCode: 400,
      message: 'O cliente vinculado ao contrato precisa estar ativo e classificado como cliente.',
    })
  }

  const description = parseGenerationText(payload.description, 'Descrição', { required: true })
  const firstDueDate = parseRequiredDate(payload.firstDueDate, 'Primeiro vencimento')
  const notes = optionalString(payload.notes)
  const accountId = parseGenerationText(payload.accountId, 'Conta', { required: true })
  const categoryId = parseGenerationText(payload.categoryId, 'Categoria', { required: true })
  const subcategoryId = optionalString(payload.subcategoryId)
  const costCenterId = optionalString(payload.costCenterId)
  const paymentMethodId = optionalString(payload.paymentMethodId)

  const [account, category, subcategory, costCenter, paymentMethod] = await Promise.all([
    prisma.account.findFirst({
      where: {
        id: accountId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    }),
    prisma.category.findFirst({
      where: {
        id: categoryId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        parentId: true,
        type: true,
      },
    }),
    subcategoryId
      ? prisma.category.findFirst({
          where: {
            id: subcategoryId,
            deletedAt: null,
            isActive: true,
          },
          select: {
            id: true,
            parentId: true,
            type: true,
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
          select: { id: true },
        })
      : Promise.resolve(null),
    paymentMethodId
      ? prisma.paymentMethod.findFirst({
          where: {
            id: paymentMethodId,
            deletedAt: null,
            isActive: true,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  if (!account) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma conta válida.',
    })
  }

  if (!category) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma categoria válida.',
    })
  }

  if (category.parentId || category.type !== 'INCOME') {
    throw createError({
      statusCode: 400,
      message: 'A categoria precisa ser principal e do tipo entrada.',
    })
  }

  if (subcategoryId) {
    if (!subcategory || subcategory.parentId !== category.id || subcategory.type !== 'INCOME') {
      throw createError({
        statusCode: 400,
        message: 'A subcategoria deve pertencer à categoria selecionada e ser do tipo entrada.',
      })
    }
  }

  if (costCenterId && !costCenter) {
    throw createError({
      statusCode: 400,
      message: 'Selecione um centro de custo válido.',
    })
  }

  if (paymentMethodId && !paymentMethod) {
    throw createError({
      statusCode: 400,
      message: 'Selecione uma forma de pagamento válida.',
    })
  }

  const frequency = contract.billingFrequency ?? 'MONTHLY'
  const count = contract.billingModel === 'CASH'
    ? 1
    : contract.billingOccurrences ?? 0

  if (!count) {
    throw createError({
      statusCode: 400,
      message: 'O contrato não possui configuração de cobrança suficiente para gerar lançamentos.',
    })
  }

  const amounts = contract.billingModel === 'INSTALLMENT'
    ? splitInstallments(Number(contract.finalAmount), count)
    : Array.from({ length: count }, () => Number(contract.finalAmount))
  const recurrenceGroupId = count > 1 ? randomUUID() : null
  const recurrenceType = contract.billingModel === 'CASH'
    ? 'ONE_TIME'
    : contract.billingModel === 'INSTALLMENT'
      ? 'INSTALLMENT'
      : 'FIXED'

  const created = await prisma.$transaction(async (tx) => {
    const createdIds: string[] = []

    for (let index = 0; index < count; index += 1) {
      const scheduledDueDate = contract.billingModel === 'CASH'
        ? firstDueDate
        : addBillingOffset(firstDueDate, frequency, index)
      const effectiveDueDate = await resolveEffectiveDueDate(scheduledDueDate)
      const amount = amounts[index]

      if (amount === undefined) {
        throw createError({
          statusCode: 500,
          message: 'Falha ao calcular os valores dos lançamentos do contrato.',
        })
      }

      const record = await tx.financialEntry.create({
        data: {
          direction: 'INCOME',
          type: 'NORMAL',
          status: 'OPEN',
          description,
          amount,
          competenceDate: scheduledDueDate,
          scheduledDueDate,
          effectiveDueDate,
          accountId: account.id,
          paymentMethodId: paymentMethod?.id ?? null,
          contactId: contract.clientId,
          categoryId: category.id,
          subcategoryId: subcategory?.id ?? null,
          costCenterId: costCenter?.id ?? null,
          contractId: contract.id,
          recurrenceType,
          recurrenceFrequency: recurrenceType === 'ONE_TIME' ? null : frequency,
          recurrenceGroupId,
          recurrenceIndex: recurrenceType === 'ONE_TIME' ? null : index + 1,
          recurrenceTotal: recurrenceType === 'ONE_TIME' ? null : count,
          notes,
        },
        select: {
          id: true,
        },
      })

      createdIds.push(record.id)
    }

    return createdIds
  })

  return {
    count: created.length,
    firstEntryId: created[0] ?? null,
    recurrenceGroupId,
  }
}
