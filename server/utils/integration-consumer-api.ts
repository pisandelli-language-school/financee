import type { H3Event } from 'h3'
import type { IntegrationScope } from '~~/server/utils/integrations'
import {
  logIntegrationEvent,
  requireIntegrationAuthentication,
} from '~~/server/utils/integrations'
import { prisma } from '~~/server/utils/prisma'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

function parsePositiveInteger(value: unknown, fallback: number, maximum: number) {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, maximum)
}

function parsePagination(event: H3Event) {
  const query = getQuery(event)
  const page = parsePositiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER)
  const pageSize = parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  }
}

function dateOnly(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null
}

function toJsonErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Falha inesperada na API de integração.'
}

async function executeConsumerOperation<T>(
  event: H3Event,
  scope: IntegrationScope,
  operation: string,
  task: () => Promise<T>,
  summarize: (result: T) => Record<string, unknown>,
  getEntity?: (result: T) => { entityType: string, entityId: string },
) {
  const authentication = await requireIntegrationAuthentication(event, scope)

  try {
    const result = await task()
    const entity = getEntity?.(result)
    await logIntegrationEvent({
      provider: 'integration-api',
      operation,
      direction: 'EXPOSED_API',
      status: 'SUCCESS',
      clientId: authentication.clientId,
      requestSummary: { clientKey: authentication.clientKey },
      responseSummary: summarize(result),
      entityType: entity?.entityType,
      entityId: entity?.entityId,
    })
    return result
  } catch (error) {
    await logIntegrationEvent({
      provider: 'integration-api',
      operation,
      direction: 'EXPOSED_API',
      status: 'FAILED',
      clientId: authentication.clientId,
      requestSummary: { clientKey: authentication.clientKey },
      errorMessage: toJsonErrorMessage(error),
    }).catch(() => undefined)
    throw error
  }
}

function serializeContact(contact: {
  id: string
  name: string
  tradeName: string | null
  document: string | null
  documentType: string | null
  nature: string
  birthDate: Date | null
  municipalRegistration: string | null
  email: string | null
  phone: string | null
  address: {
    country: string
    state: string | null
    city: string | null
    postalCode: string | null
    street: string | null
    number: string | null
    complement: string | null
    district: string | null
  } | null
  financialResponsible: {
    name: string
    email: string
    phone: string | null
    role: string | null
  } | null
  roleAssignments: Array<{ role: string }>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: contact.id,
    name: contact.name,
    tradeName: contact.tradeName,
    document: contact.document,
    documentType: contact.documentType,
    nature: contact.nature,
    roles: contact.roleAssignments.map(assignment => assignment.role),
    birthDate: dateOnly(contact.birthDate),
    municipalRegistration: contact.municipalRegistration,
    email: contact.email,
    phone: contact.phone,
    address: contact.address,
    financialResponsible: contact.financialResponsible,
    isActive: contact.isActive,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  }
}

function serializeContract(contract: {
  id: string
  title: string
  clientId: string
  status: string
  originalAmount: { toString(): string }
  discountAmount: { toString(): string } | null
  finalAmount: { toString(): string }
  totalHours: number | null
  weeklyHours: number | null
  startDate: Date
  expectedEndDate: Date | null
  billingModel: string
  billingFrequency: string | null
  billingOccurrences: number | null
  firstDueDate: Date | null
  source: string
  externalContractId: string | null
  renewalOfContractId: string | null
  client: { id: string, name: string, tradeName: string | null }
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: contract.id,
    title: contract.title,
    status: contract.status,
    client: contract.client,
    originalAmount: Number(contract.originalAmount),
    discountAmount: contract.discountAmount == null ? null : Number(contract.discountAmount),
    finalAmount: Number(contract.finalAmount),
    totalHours: contract.totalHours,
    weeklyHours: contract.weeklyHours,
    startDate: dateOnly(contract.startDate),
    expectedEndDate: dateOnly(contract.expectedEndDate),
    billingModel: contract.billingModel,
    billingFrequency: contract.billingFrequency,
    billingOccurrences: contract.billingOccurrences,
    firstDueDate: dateOnly(contract.firstDueDate),
    source: contract.source,
    externalContractId: contract.externalContractId,
    renewalOfContractId: contract.renewalOfContractId,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  }
}

export async function listIntegrationContacts(event: H3Event) {
  const pagination = parsePagination(event)

  return await executeConsumerOperation(event, 'contacts.read', 'contacts.list', async () => {
    const where = { deletedAt: null }
    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: pagination.skip,
        take: pagination.pageSize,
        include: {
          roleAssignments: { select: { role: true } },
          address: true,
          financialResponsible: true,
        },
      }),
      prisma.contact.count({ where }),
    ])

    return {
      items: items.map(serializeContact),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
  }, response => ({ itemCount: response.items.length, total: response.total }))
}

export async function getIntegrationContact(event: H3Event, id: string) {
  return await executeConsumerOperation(event, 'contacts.read', 'contacts.get', async () => {
    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        roleAssignments: { select: { role: true } },
        address: true,
        financialResponsible: true,
      },
    })

    if (!contact) {
      throw createError({ statusCode: 404, message: 'Contato não encontrado.' })
    }

    return serializeContact(contact)
  }, response => ({ entityType: 'Contact', entityId: response.id }), response => ({
    entityType: 'Contact',
    entityId: response.id,
  }))
}

export async function listIntegrationContracts(event: H3Event) {
  const pagination = parsePagination(event)

  return await executeConsumerOperation(event, 'contracts.read', 'contracts.list', async () => {
    const where = { deletedAt: null }
    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: pagination.skip,
        take: pagination.pageSize,
        include: {
          client: { select: { id: true, name: true, tradeName: true } },
        },
      }),
      prisma.contract.count({ where }),
    ])

    return {
      items: items.map(serializeContract),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
  }, response => ({ itemCount: response.items.length, total: response.total }))
}

export async function getIntegrationContract(event: H3Event, id: string) {
  return await executeConsumerOperation(event, 'contracts.read', 'contracts.get', async () => {
    const contract = await prisma.contract.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, tradeName: true } },
      },
    })

    if (!contract) {
      throw createError({ statusCode: 404, message: 'Contrato não encontrado.' })
    }

    return serializeContract(contract)
  }, response => ({ entityType: 'Contract', entityId: response.id }), response => ({
    entityType: 'Contract',
    entityId: response.id,
  }))
}
