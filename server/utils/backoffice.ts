import type {
  CategoryType,
  ContactDocumentType,
  ContactNature,
  ContactRole,
  NonBusinessDayRule,
  NonBusinessDayScope,
  NonBusinessDayType,
} from '@prisma/client'
import {
  Prisma,
} from '@prisma/client'
import type { H3Event } from 'h3'
import type {
  AccountFormValues,
  AccountRecord,
  CategoryFilters,
  CategoryFormValues,
  CategoryRecord,
  ContactAddressRecord,
  ContactFilters,
  ContactFinancialResponsibleRecord,
  ContactFormValues,
  ContactRecord,
  CostCenterRecord,
  NonBusinessDayFilters,
  NonBusinessDayFormValues,
  NonBusinessDayRecord,
  PaginatedResponse,
  PaymentMethodRecord,
  FinancialInstitutionRecord,
  SimpleCatalogFormValues,
  TagFormValues,
  TagRecord,
} from '~~/app/types/backoffice'
import { prisma } from '~~/server/utils/prisma'

type BackofficeSection =
  | 'categorias'
  | 'contas-carteiras'
  | 'instituicoes-financeiras'
  | 'centros-custo'
  | 'tags'
  | 'contatos'
  | 'formas-pagamento'
  | 'dias-nao-uteis'

interface PaginationInput {
  page: number
  pageSize: number
  search: string
}

interface SimpleCatalogSource {
  id: string
  name: string
  type?: string
  initialValue?: Prisma.Decimal | number | null
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}

interface AccountSource {
  id: string
  name: string
  type: string
  initialValue: Prisma.Decimal | number | null
  institutionId: string | null
  institution: {
    name: string
    logoKey: string
  } | null
  alertOnLowBalance: boolean
  contactPhone: string | null
  contactEmail: string | null
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function optionalString(value: unknown) {
  const normalized = normalizeString(value)
  return normalized ? normalized : null
}

function parseBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value === 'true'
  }

  return fallback
}

function parseNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateOnly(value: unknown) {
  const normalized = normalizeString(value)

  if (!normalized) {
    return null
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`)
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

function withNotDeleted<T extends Record<string, unknown>>(where: T) {
  return {
    ...where,
    deletedAt: null,
  }
}

function parsePagination(event: H3Event): PaginationInput {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page ?? 1) || 1)
  const rawPageSize = Number(query.pageSize ?? 50)
  const pageSize = !Number.isFinite(rawPageSize)
    ? 50
    : rawPageSize <= 0
      ? 0
      : Math.max(1, Math.min(200, rawPageSize))

  return {
    page,
    pageSize,
    search: normalizeString(query.search),
  }
}

function getPaginationWindow({ page, pageSize }: PaginationInput): { skip?: number; take?: number } {
  if (pageSize === 0) {
    return {}
  }

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

function buildPaginatedResponse<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
  }
}

function dependencyError(title: string, description: string) {
  throw createError({
    statusCode: 409,
    statusMessage: 'DEPENDENCY_BLOCKED',
    data: {
      title,
      description,
    },
  })
}

function validationError(message: string, field?: string) {
  throw createError({
    statusCode: 400,
    statusMessage: message,
    data: field ? { field, message } : { message },
  })
}

function handleKnownPrismaError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Registro duplicado.',
      data: {
        code: 'DUPLICATE',
      },
    })
  }

  sanitizeInternalError(error)
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    const cause = 'cause' in error ? (error as Error & { cause?: unknown }).cause : undefined

    return [
      error.message,
      typeof cause === 'string' ? cause : '',
      cause && typeof cause === 'object' ? JSON.stringify(cause) : '',
    ].filter(Boolean).join('\n')
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    return JSON.stringify(error)
  }

  return ''
}

function isNuxtHttpError(error: unknown): error is { statusCode: number } {
  return Boolean(
    error
    && typeof error === 'object'
    && 'statusCode' in error
    && typeof error.statusCode === 'number',
  )
}

function sanitizeInternalError(error: unknown): never {
  if (isNuxtHttpError(error)) {
    throw error
  }

  console.error('Unhandled backoffice error:', error)

  throw createError({
    statusCode: 500,
    message: 'Erro interno no servidor.',
  })
}

export function handleBackofficeInfrastructureError(error: unknown): never {
  const details = errorText(error)

  if (
    details.includes('max_connections_per_hour')
    || details.includes("has exceeded the 'max_connections_per_hour' resource")
    || details.includes('pool timeout: failed to retrieve a connection from pool')
  ) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Database temporarily unavailable.',
      data: {
        code: 'DB_RATE_LIMITED',
        title: 'Database temporarily unavailable',
        description: 'The MySQL host has temporarily blocked new connections due to hosting limits. Please wait a few minutes and try again.',
      },
    })
  }

  sanitizeInternalError(error)
}

async function finalizePaginatedQuery<T>(
  itemsPromise: Promise<T[]>,
  countPromiseFactory: () => Promise<number>,
  page: number,
  pageSize: number,
) {
  const items = await itemsPromise

  if (pageSize === 0) {
    return {
      items,
      total: items.length,
    }
  }

  const skip = (page - 1) * pageSize

  if (items.length < pageSize) {
    return {
      items,
      total: skip + items.length,
    }
  }

  const total = await countPromiseFactory()

  return {
    items,
    total,
  }
}

function mapCategory(record: {
  id: string
  name: string
  type: CategoryType
  dreGroup: string | null
  parentId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  parent: { name: string } | null
  _count: { subcategories: number }
}): CategoryRecord {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    dreGroup: record.dreGroup as CategoryRecord['dreGroup'],
    parentId: record.parentId,
    parentName: record.parent?.name ?? null,
    subcategoryCount: record._count.subcategories,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapSimpleRecord<T extends SimpleCatalogSource>(
  record: T,
): AccountRecord | CostCenterRecord | PaymentMethodRecord {
  return {
    id: record.id,
    name: record.name,
    type: 'type' in record ? record.type ?? '' : undefined,
    initialValue: 'initialValue' in record
      ? record.initialValue == null
        ? null
        : Number(record.initialValue)
      : undefined,
    isActive: 'isActive' in record ? record.isActive ?? true : true,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  } as AccountRecord | CostCenterRecord | PaymentMethodRecord
}

function mapAccountRecord(record: AccountSource): AccountRecord {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    initialValue: record.initialValue == null ? null : Number(record.initialValue),
    institutionId: record.institutionId,
    institutionName: record.institution?.name ?? null,
    institutionLogoKey: record.institution?.logoKey ?? null,
    alertOnLowBalance: record.alertOnLowBalance,
    contactPhone: record.contactPhone,
    contactEmail: record.contactEmail,
    notes: record.notes,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapFinancialInstitution(record: {
  id: string
  code: string
  name: string
  logoKey: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): FinancialInstitutionRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    logoKey: record.logoKey,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapTag(record: { id: string; name: string; bgColor: string | null; textColor: string | null; isActive: boolean; createdAt: Date; updatedAt: Date }): TagRecord {
  return {
    id: record.id,
    name: record.name,
    bgColor: record.bgColor,
    textColor: record.textColor,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapContact(record: {
  id: string
  name: string
  tradeName: string | null
  document: string | null
  documentType: ContactDocumentType | null
  nature: ContactNature
  roleAssignments: Array<{ role: ContactRole }>
  birthDate: Date | null
  municipalRegistration: string | null
  email: string | null
  phone: string | null
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
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
}): ContactRecord {
  return {
    id: record.id,
    name: record.name,
    tradeName: record.tradeName,
    document: record.document,
    documentType: record.documentType,
    nature: record.nature,
    roles: record.roleAssignments.map((assignment) => assignment.role),
    birthDate: toIsoDate(record.birthDate),
    municipalRegistration: record.municipalRegistration,
    email: record.email,
    phone: record.phone,
    notes: record.notes,
    isActive: record.isActive,
    address: record.address
      ? {
          country: record.address.country,
          state: record.address.state ?? '',
          city: record.address.city ?? '',
          postalCode: record.address.postalCode ?? '',
          street: record.address.street ?? '',
          number: record.address.number ?? '',
          complement: record.address.complement ?? '',
          district: record.address.district ?? '',
        }
      : null,
    financialResponsible: record.financialResponsible
      ? {
          name: record.financialResponsible.name,
          email: record.financialResponsible.email,
          phone: record.financialResponsible.phone ?? '',
          role: record.financialResponsible.role ?? '',
        }
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

const contactInclude = {
  address: true,
  financialResponsible: true,
  roleAssignments: {
    select: {
      role: true,
    },
  },
} satisfies Prisma.ContactInclude

const calculatedDescriptions: Record<NonBusinessDayRule, string> = {
  EASTER_MINUS_47: 'Pascoa - 47 dias',
  EASTER_MINUS_2: 'Pascoa - 2 dias',
  EASTER_PLUS_60: 'Pascoa + 60 dias',
}

function mapNonBusinessDay(record: {
  id: string
  title: string
  type: NonBusinessDayType
  month: number | null
  day: number | null
  rule: NonBusinessDayRule | null
  date: Date | null
  scope: NonBusinessDayScope | null
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): NonBusinessDayRecord {
  let description = '-'

  if (record.type === 'FIXED' && record.day && record.month) {
    description = `Repete todo ano em ${String(record.day).padStart(2, '0')}/${String(record.month).padStart(2, '0')}`
  }

  if (record.type === 'CALCULATED' && record.rule) {
    description = calculatedDescriptions[record.rule] ?? '-'
  }

  if (record.type === 'CUSTOM' && record.date) {
    description = toIsoDate(record.date) ?? '-'
  }

  return {
    id: record.id,
    title: record.title,
    type: record.type,
    month: record.month,
    day: record.day,
    rule: record.rule,
    date: toIsoDate(record.date),
    scope: record.scope,
    notes: record.notes,
    description,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function validateCategoryParent(parentId: string | null, type: CategoryType, currentId?: string) {
  if (!parentId) {
    return null
  }

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    include: { parent: true },
  })

  if (!parent || parent.deletedAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Categoria pai não encontrada.',
      data: {
        field: 'parentId',
        message: 'Categoria pai não encontrada.',
      },
    })
  }

  if (parent.id === currentId) {
    validationError('Uma categoria não pode ser pai dela mesma.', 'parentId')
  }

  if (parent.parentId) {
    validationError('A categoria pai precisa estar no primeiro nivel.', 'parentId')
  }

  if (parent.type !== type) {
    validationError('A categoria pai precisa ter o mesmo tipo.', 'parentId')
  }

  return parent
}

async function assertUniqueTagName(name: string, currentId?: string) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM Tag
    WHERE deletedAt IS NULL
      AND BINARY name = ${name}
      ${currentId ? Prisma.sql`AND id <> ${currentId}` : Prisma.empty}
    LIMIT 1
  `)

  if (existing.length > 0) {
    validationError('Ja existe uma tag com esse nome.', 'name')
  }
}

async function assertUniqueCategory(
  name: string,
  type: CategoryType,
  parentId: string | null,
  currentId?: string,
) {
  const existing = await prisma.category.findFirst({
    where: {
      name,
      type,
      parentId,
      deletedAt: null,
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    validationError('Ja existe uma categoria com este nome neste contexto.', 'name')
  }
}

function validateRoles(roles: string[]): ContactRole[] {
  const allowedRoles = ['CLIENT', 'SUPPLIER', 'OTHER'] as const
  const validRoles = roles.filter((role): role is ContactRole =>
    allowedRoles.includes(role as ContactRole),
  )

  if (!validRoles.length) {
    validationError('Selecione ao menos um papel para o contato.', 'roles')
  }

  return validRoles
}

function normalizeAddress(address: ContactAddressRecord | null | undefined) {
  if (!address) {
    return null
  }

  const normalized = {
    country: normalizeString(address.country) || 'BRASIL',
    state: normalizeString(address.state),
    city: normalizeString(address.city),
    postalCode: normalizeString(address.postalCode),
    street: normalizeString(address.street),
    number: normalizeString(address.number),
    complement: normalizeString(address.complement),
    district: normalizeString(address.district),
  }

  const hasValue = Object.values(normalized).some((value, index) => index === 0 ? false : Boolean(value))
  return hasValue ? normalized : null
}

function normalizeFinancialResponsible(
  financialResponsible: ContactFinancialResponsibleRecord | null | undefined,
) {
  if (!financialResponsible) {
    return null
  }

  const normalized = {
    name: normalizeString(financialResponsible.name),
    email: normalizeString(financialResponsible.email),
    phone: normalizeString(financialResponsible.phone),
    role: normalizeString(financialResponsible.role),
  }

  if (!normalized.name && !normalized.email && !normalized.phone && !normalized.role) {
    return null
  }

  if (!normalized.name || !normalized.email) {
    validationError('Responsável financeiro precisa de nome e email.', 'financialResponsible')
  }

  if (normalized.email && !isValidEmail(normalized.email)) {
    validationError('Email do responsável financeiro inválido.', 'financialResponsible.email')
  }

  return normalized
}

export function normalizeContactPayload(payload: ContactFormValues) {
  const name = normalizeString(payload.name)

  if (!name) {
    validationError('Nome do contato e obrigatorio.', 'name')
  }

  const roles = validateRoles(payload.roles)
  const nature = payload.nature as ContactNature
  const document = optionalString(payload.document)
  const birthDate = parseDateOnly(payload.birthDate)
  const email = optionalString(payload.email)
  const phone = optionalString(payload.phone)
  const financialResponsible = normalizeFinancialResponsible(payload.financialResponsible)

  if (nature === 'INDIVIDUAL' && !birthDate && !document) {
    validationError('Pessoa fisica deve ter CPF ou data de nascimento.', 'document')
  }

  if (nature === 'COMPANY' && !document) {
    validationError('Pessoa juridica deve informar CNPJ.', 'document')
  }

  if (nature === 'COMPANY' && financialResponsible === null) {
    validationError('Pessoa juridica deve informar responsavel financeiro.', 'financialResponsible')
  }

  if ((nature === 'INDIVIDUAL' || nature === 'COMPANY') && !email) {
    validationError('Informe o e-mail.', 'email')
  }

  if (email && !isValidEmail(email)) {
    validationError('Email inválido.', 'email')
  }

  if ((nature === 'INDIVIDUAL' || nature === 'COMPANY') && !phone) {
    validationError('Informe o telefone.', 'phone')
  }

  if (nature === 'FOREIGN' && payload.documentType === 'CPF') {
    validationError('Contato estrangeiro não pode usar CPF.', 'documentType')
  }

  let documentType: ContactDocumentType | null = payload.documentType || null

  if (!documentType && document) {
    if (nature === 'INDIVIDUAL') {
      documentType = 'CPF'
    } else if (nature === 'COMPANY') {
      documentType = 'CNPJ'
    } else {
      documentType = 'FOREIGN_DOCUMENT'
    }
  }

  return {
    name,
    tradeName: optionalString(payload.tradeName),
    document,
    documentType,
    nature,
    roles,
    birthDate,
    municipalRegistration: optionalString(payload.municipalRegistration),
    email,
    phone,
    notes: optionalString(payload.notes),
    isActive: parseBoolean(payload.isActive, true),
    address: normalizeAddress(payload.address),
    financialResponsible,
  }
}

function normalizeSimplePayload(
  payload: SimpleCatalogFormValues,
  options: {
    requireType?: boolean
    entityLabel?: string
  } = {},
) {
  const name = normalizeString(payload.name)

  if (!name) {
    validationError('Nome e obrigatorio.', 'name')
  }

  const type = optionalString(payload.type)

  if (options.requireType && !type) {
    validationError(`Tipo${options.entityLabel ? ` da ${options.entityLabel}` : ''} é obrigatório.`, 'type')
  }

  return {
    name,
    type,
    initialValue: parseNullableNumber(payload.initialValue),
    isActive: parseBoolean(payload.isActive, true),
  }
}

function normalizeAccountPayload(payload: AccountFormValues) {
  const name = normalizeString(payload.name)
  const type = normalizeString(payload.type)
  const contactEmail = optionalString(payload.contactEmail)

  if (!name) {
    validationError('Nome da conta é obrigatório.', 'name')
  }

  if (!type) {
    validationError('Tipo da conta é obrigatório.', 'type')
  }

  if (contactEmail && !isValidEmail(contactEmail)) {
    validationError('Email inválido.', 'contactEmail')
  }

  return {
    name,
    type,
    initialValue: parseNullableNumber(payload.initialValue),
    institutionId: optionalString(payload.institutionId),
    alertOnLowBalance: parseBoolean(payload.alertOnLowBalance, false),
    contactPhone: optionalString(payload.contactPhone),
    contactEmail,
    notes: optionalString(payload.notes),
    isActive: parseBoolean(payload.isActive, true),
  }
}

export function normalizeTagPayload(payload: TagFormValues) {
  const name = normalizeString(payload.name)

  if (!name) {
    validationError('Nome da tag e obrigatorio.', 'name')
  }

  return {
    name,
    bgColor: optionalString(payload.bgColor),
    textColor: optionalString(payload.textColor),
    isActive: parseBoolean(payload.isActive, true),
  }
}

export function normalizeCategoryPayload(payload: CategoryFormValues) {
  const name = normalizeString(payload.name)

  if (!name) {
    validationError('Nome da categoria e obrigatorio.', 'name')
  }

  if (!payload.type) {
    validationError('Tipo da categoria é obrigatório.', 'type')
  }

  return {
    name,
    type: payload.type as CategoryType,
    dreGroup: payload.dreGroup || null,
    parentId: optionalString(payload.parentId),
    isActive: parseBoolean(payload.isActive, true),
  }
}

export function normalizeNonBusinessDayPayload(payload: NonBusinessDayFormValues) {
  const title = normalizeString(payload.title)

  if (!title) {
    validationError('Título é obrigatório.', 'title')
  }

  const type = payload.type as NonBusinessDayType
  const month = payload.month ?? null
  const day = payload.day ?? null
  const date = parseDateOnly(payload.date)
  const rule = (payload.rule || null) as NonBusinessDayRule | null

  if (type === 'FIXED' && (!month || !day)) {
    validationError('Datas fixas exigem mes e dia.', 'month')
  }

  if (type === 'CALCULATED' && !rule) {
    validationError('Datas calculadas exigem uma regra.', 'rule')
  }

  if (type === 'CUSTOM' && !date) {
    validationError('Datas customizadas exigem uma data completa.', 'date')
  }

  return {
    title,
    type,
    month: type === 'FIXED' ? month : null,
    day: type === 'FIXED' ? day : null,
    rule: type === 'CALCULATED' ? rule : null,
    date: type === 'CUSTOM' ? date : null,
    scope: (payload.scope || null) as NonBusinessDayScope | null,
    notes: optionalString(payload.notes),
    isActive: parseBoolean(payload.isActive, true),
  }
}

export async function listCategories(event: H3Event) {
  const pagination = parsePagination(event)
  const query = getQuery(event)
  const type = normalizeString(query.type) as CategoryFilters['type']
  const where: Prisma.CategoryWhereInput = withNotDeleted({
    ...(pagination.search
      ? {
          name: {
            contains: pagination.search,
          },
        }
      : {}),
    ...(type ? { type: type as CategoryType } : {}),
  })

  const { items, total } = await finalizePaginatedQuery(
    prisma.category.findMany({
      where,
      include: {
        parent: { select: { name: true } },
        _count: { select: { subcategories: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      ...getPaginationWindow(pagination),
    }),
    () => prisma.category.count({ where }),
    pagination.page,
    pagination.pageSize,
  )

  return buildPaginatedResponse(items.map(mapCategory), total, pagination.page, pagination.pageSize)
}

export async function createCategory(event: H3Event) {
  try {
    const payload = normalizeCategoryPayload(await readBody<CategoryFormValues>(event))
    await validateCategoryParent(payload.parentId, payload.type)
    await assertUniqueCategory(payload.name, payload.type, payload.parentId)

    const record = await prisma.category.create({
      data: payload,
      include: {
        parent: { select: { name: true } },
        _count: { select: { subcategories: true } },
      },
    })

    return mapCategory(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function updateCategory(event: H3Event, id: string) {
  try {
    const payload = normalizeCategoryPayload(await readBody<CategoryFormValues>(event))
    await validateCategoryParent(payload.parentId, payload.type, id)
    await assertUniqueCategory(payload.name, payload.type, payload.parentId, id)

    const record = await prisma.category.update({
      where: { id },
      data: payload,
      include: {
        parent: { select: { name: true } },
        _count: { select: { subcategories: true } },
      },
    })

    return mapCategory(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function deleteCategory(id: string) {
  const children = await prisma.category.count({
    where: withNotDeleted({ parentId: id }),
  })

  if (children > 0) {
    dependencyError(
      'Categoria com dependencias',
      'Remova ou reclassifique as subcategorias antes de excluir esta categoria.',
    )
  }

  await prisma.category.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  })
  return { ok: true }
}

async function listSimpleSection<T extends 'account' | 'costCenter' | 'paymentMethod'>(
  model: T,
  event: H3Event,
) {
  const pagination = parsePagination(event)
  const where = withNotDeleted(pagination.search
    ? {
        name: {
          contains: pagination.search,
        },
      }
    : {})

  const query = {
    where,
    orderBy: [{ createdAt: 'desc' as const }, { name: 'asc' as const }],
    ...getPaginationWindow(pagination),
  }

  const { items, total } = model === 'account'
    ? await finalizePaginatedQuery(
        prisma.account.findMany(query),
        () => prisma.account.count({ where }),
        pagination.page,
        pagination.pageSize,
      )
    : model === 'costCenter'
      ? await finalizePaginatedQuery(
          prisma.costCenter.findMany(query),
          () => prisma.costCenter.count({ where }),
          pagination.page,
          pagination.pageSize,
        )
      : await finalizePaginatedQuery(
          prisma.paymentMethod.findMany(query),
          () => prisma.paymentMethod.count({ where }),
          pagination.page,
          pagination.pageSize,
        )

  return buildPaginatedResponse(
    items.map((item: SimpleCatalogSource) => mapSimpleRecord(item)),
    total,
    pagination.page,
    pagination.pageSize,
  )
}

export async function listFinancialInstitutions(event: H3Event) {
  const pagination = parsePagination(event)
  const where = withNotDeleted(pagination.search
    ? {
        OR: [
          { name: { contains: pagination.search } },
          { code: { contains: pagination.search } },
        ],
      }
    : {})

  const { items, total } = await finalizePaginatedQuery(
    prisma.financialInstitution.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      ...getPaginationWindow(pagination),
    }),
    () => prisma.financialInstitution.count({ where }),
    pagination.page,
    pagination.pageSize,
  )

  return buildPaginatedResponse(items.map(mapFinancialInstitution), total, pagination.page, pagination.pageSize)
}

export async function listAccounts(event: H3Event) {
  const pagination = parsePagination(event)
  const where: Prisma.AccountWhereInput = withNotDeleted(pagination.search
    ? {
        OR: [
          { name: { contains: pagination.search } },
          { institution: { name: { contains: pagination.search } } },
          { type: { contains: pagination.search } },
        ],
      }
    : {})

  const { items, total } = await finalizePaginatedQuery(
    prisma.account.findMany({
      where,
      include: {
        institution: {
          select: {
            name: true,
            logoKey: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      ...getPaginationWindow(pagination),
    }),
    () => prisma.account.count({ where }),
    pagination.page,
    pagination.pageSize,
  )

  return buildPaginatedResponse(items.map(item => mapAccountRecord(item as AccountSource)), total, pagination.page, pagination.pageSize)
}

export async function getAccount(id: string) {
  const record = await prisma.account.findFirst({
    where: withNotDeleted({ id }),
    include: {
      institution: {
        select: {
          name: true,
          logoKey: true,
        },
      },
    },
  })

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'Conta não encontrada.' })
  }

  return mapAccountRecord(record as AccountSource)
}

export async function createAccount(event: H3Event) {
  const payload = normalizeAccountPayload(await readBody<AccountFormValues>(event))

  if (payload.institutionId) {
    const institution = await prisma.financialInstitution.findFirst({
      where: withNotDeleted({
        id: payload.institutionId,
        isActive: true,
      }),
      select: { id: true },
    })

    if (!institution) {
      validationError('Instituição financeira não encontrada.', 'institutionId')
    }
  }

  try {
    const record = await prisma.account.create({
      data: payload,
      include: {
        institution: {
          select: {
            name: true,
            logoKey: true,
          },
        },
      },
    })

    return mapAccountRecord(record as AccountSource)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function updateAccount(event: H3Event, id: string) {
  const payload = normalizeAccountPayload(await readBody<AccountFormValues>(event))

  if (payload.institutionId) {
    const institution = await prisma.financialInstitution.findFirst({
      where: withNotDeleted({
        id: payload.institutionId,
        isActive: true,
      }),
      select: { id: true },
    })

    if (!institution) {
      validationError('Instituição financeira não encontrada.', 'institutionId')
    }
  }

  try {
    const record = await prisma.account.update({
      where: { id },
      data: payload,
      include: {
        institution: {
          select: {
            name: true,
            logoKey: true,
          },
        },
      },
    })

    return mapAccountRecord(record as AccountSource)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function deleteAccount(id: string) {
  await prisma.account.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  })

  return { ok: true }
}

async function createSimpleSection<T extends 'account' | 'costCenter' | 'paymentMethod'>(
  model: T,
  event: H3Event,
) {
  const payload = normalizeSimplePayload(
    await readBody<SimpleCatalogFormValues>(event),
    model === 'account'
      ? { requireType: true, entityLabel: 'conta' }
      : {},
  )

  try {
    const record = model === 'account'
      ? await prisma.account.create({
          data: {
            name: payload.name,
            type: payload.type ?? 'Conta corrente',
            initialValue: payload.initialValue,
            isActive: payload.isActive,
          },
        })
      : model === 'costCenter'
        ? await prisma.costCenter.create({
            data: {
              name: payload.name,
              isActive: payload.isActive,
            },
          })
        : await prisma.paymentMethod.create({
            data: {
              name: payload.name,
              isActive: payload.isActive,
            },
          })

    return mapSimpleRecord(record as never)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

async function updateSimpleSection<T extends 'account' | 'costCenter' | 'paymentMethod'>(
  model: T,
  id: string,
  event: H3Event,
) {
  const payload = normalizeSimplePayload(
    await readBody<SimpleCatalogFormValues>(event),
    model === 'account'
      ? { requireType: true, entityLabel: 'conta' }
      : {},
  )

  try {
    const record = model === 'account'
      ? await prisma.account.update({
          where: { id },
          data: {
            name: payload.name,
            type: payload.type ?? 'Conta corrente',
            initialValue: payload.initialValue,
            isActive: payload.isActive,
          },
        })
      : model === 'costCenter'
        ? await prisma.costCenter.update({
            where: { id },
            data: {
              name: payload.name,
              isActive: payload.isActive,
            },
          })
        : await prisma.paymentMethod.update({
            where: { id },
            data: {
              name: payload.name,
              isActive: payload.isActive,
            },
          })

    return mapSimpleRecord(record as never)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

async function deleteSimpleSection<T extends 'account' | 'costCenter' | 'paymentMethod'>(
  model: T,
  id: string,
) {
  if (model === 'account') {
    await prisma.account.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    })
  } else if (model === 'costCenter') {
    await prisma.costCenter.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    })
  } else {
    await prisma.paymentMethod.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    })
  }

  return { ok: true }
}

export async function listTags(event: H3Event) {
  const pagination = parsePagination(event)
  const where = withNotDeleted(pagination.search
    ? {
        name: {
          contains: pagination.search,
        },
      }
    : {})

  const { items, total } = await finalizePaginatedQuery(
    prisma.tag.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      ...getPaginationWindow(pagination),
    }),
    () => prisma.tag.count({ where }),
    pagination.page,
    pagination.pageSize,
  )

  return buildPaginatedResponse(items.map(mapTag), total, pagination.page, pagination.pageSize)
}

export async function createTag(event: H3Event) {
  const payload = normalizeTagPayload(await readBody<TagFormValues>(event))
  await assertUniqueTagName(payload.name)

  try {
    const record = await prisma.tag.create({ data: payload })
    return mapTag(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function updateTag(event: H3Event, id: string) {
  const payload = normalizeTagPayload(await readBody<TagFormValues>(event))
  await assertUniqueTagName(payload.name, id)

  try {
    const record = await prisma.tag.update({
      where: { id },
      data: payload,
    })
    return mapTag(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function deleteTag(id: string) {
  await prisma.tag.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  })
  return { ok: true }
}

export async function listContacts(event: H3Event) {
  const pagination = parsePagination(event)
  const query = getQuery(event)
  const role = normalizeString(query.role) as ContactFilters['role']
  const nature = normalizeString(query.nature) as ContactFilters['nature']
  const where: Prisma.ContactWhereInput = withNotDeleted({
    ...(pagination.search
      ? {
          OR: [
            { name: { contains: pagination.search } },
            { tradeName: { contains: pagination.search } },
            { email: { contains: pagination.search } },
            { document: { contains: pagination.search } },
          ],
        }
      : {}),
    ...(nature ? { nature: nature as ContactNature } : {}),
    ...(role ? { roleAssignments: { some: { role: role as ContactRole } } } : {}),
  })

  const { items, total } = await finalizePaginatedQuery(
    prisma.contact.findMany({
      where,
      include: contactInclude,
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      ...getPaginationWindow(pagination),
    }),
    () => prisma.contact.count({ where }),
    pagination.page,
    pagination.pageSize,
  )

  return buildPaginatedResponse(items.map(mapContact), total, pagination.page, pagination.pageSize)
}

export async function getContact(id: string) {
  const record = await prisma.contact.findUnique({
    where: { id },
    include: contactInclude,
  })

  if (!record || record.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: 'Contato não encontrado.' })
  }

  return mapContact(record)
}

export async function createContact(event: H3Event) {
  try {
    const payload = normalizeContactPayload(await readBody<ContactFormValues>(event))
    const record = await prisma.contact.create({
      data: {
        name: payload.name,
        tradeName: payload.tradeName,
        document: payload.document,
        documentType: payload.documentType,
        nature: payload.nature,
        birthDate: payload.birthDate,
        municipalRegistration: payload.municipalRegistration,
        email: payload.email,
        phone: payload.phone,
        notes: payload.notes,
        isActive: payload.isActive,
        roleAssignments: {
          create: payload.roles.map((role) => ({ role })),
        },
        ...(payload.address ? { address: { create: payload.address } } : {}),
        ...(payload.financialResponsible
          ? {
              financialResponsible: {
                create: payload.financialResponsible,
              },
            }
          : {}),
      },
      include: contactInclude,
    })

    return mapContact(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function updateContact(event: H3Event, id: string) {
  const payload = normalizeContactPayload(await readBody<ContactFormValues>(event))

  try {
    const record = await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: {
          name: payload.name,
          tradeName: payload.tradeName,
          document: payload.document,
          documentType: payload.documentType,
          nature: payload.nature,
          birthDate: payload.birthDate,
          municipalRegistration: payload.municipalRegistration,
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
          isActive: payload.isActive,
        },
      })

      await tx.contactRoleAssignment.deleteMany({
        where: { contactId: id },
      })

      if (payload.roles.length) {
        await tx.contactRoleAssignment.createMany({
          data: payload.roles.map((role) => ({
            contactId: id,
            role,
          })),
        })
      }

      if (payload.address) {
        await tx.address.upsert({
          where: { contactId: id },
          create: {
            contactId: id,
            ...payload.address,
          },
          update: payload.address,
        })
      } else {
        await tx.address.deleteMany({
          where: { contactId: id },
        })
      }

      if (payload.financialResponsible) {
        await tx.contactFinancialResponsible.upsert({
          where: { contactId: id },
          create: {
            contactId: id,
            ...payload.financialResponsible,
          },
          update: payload.financialResponsible,
        })
      } else {
        await tx.contactFinancialResponsible.deleteMany({
          where: { contactId: id },
        })
      }

      return await tx.contact.findUnique({
        where: { id },
        include: contactInclude,
      })
    })

    if (!record) {
      throw createError({ statusCode: 404, statusMessage: 'Contato não encontrado.' })
    }

    return mapContact(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function deleteContact(id: string) {
  await prisma.contact.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  })
  return { ok: true }
}

export async function listNonBusinessDays(event: H3Event) {
  const pagination = parsePagination(event)
  const query = getQuery(event)
  const type = normalizeString(query.type) as NonBusinessDayFilters['type']
  const where: Prisma.NonBusinessDayWhereInput = withNotDeleted({
    ...(pagination.search
      ? {
          title: {
            contains: pagination.search,
          },
        }
      : {}),
    ...(type ? { type: type as NonBusinessDayType } : {}),
  })

  const { items, total } = await finalizePaginatedQuery(
    prisma.nonBusinessDay.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
      ...getPaginationWindow(pagination),
    }),
    () => prisma.nonBusinessDay.count({ where }),
    pagination.page,
    pagination.pageSize,
  )

  return buildPaginatedResponse(items.map(mapNonBusinessDay), total, pagination.page, pagination.pageSize)
}

export async function createNonBusinessDay(event: H3Event) {
  try {
    const payload = normalizeNonBusinessDayPayload(await readBody<NonBusinessDayFormValues>(event))
    const record = await prisma.nonBusinessDay.create({ data: payload })
    return mapNonBusinessDay(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function updateNonBusinessDay(event: H3Event, id: string) {
  try {
    const payload = normalizeNonBusinessDayPayload(await readBody<NonBusinessDayFormValues>(event))
    const record = await prisma.nonBusinessDay.update({
      where: { id },
      data: payload,
    })
    return mapNonBusinessDay(record)
  } catch (error) {
    handleKnownPrismaError(error)
  }
}

export async function deleteNonBusinessDay(id: string) {
  await prisma.nonBusinessDay.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  })
  return { ok: true }
}

export async function listSection(section: BackofficeSection, event: H3Event) {
  switch (section) {
    case 'categorias':
      return await listCategories(event)
    case 'instituicoes-financeiras':
      return await listFinancialInstitutions(event)
    case 'contas-carteiras':
      return await listAccounts(event)
    case 'centros-custo':
      return await listSimpleSection('costCenter', event)
    case 'tags':
      return await listTags(event)
    case 'contatos':
      return await listContacts(event)
    case 'formas-pagamento':
      return await listSimpleSection('paymentMethod', event)
    case 'dias-nao-uteis':
      return await listNonBusinessDays(event)
    default:
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
  }
}

export async function createSection(section: BackofficeSection, event: H3Event) {
  switch (section) {
    case 'categorias':
      return await createCategory(event)
    case 'contas-carteiras':
      return await createAccount(event)
    case 'centros-custo':
      return await createSimpleSection('costCenter', event)
    case 'tags':
      return await createTag(event)
    case 'contatos':
      return await createContact(event)
    case 'formas-pagamento':
      return await createSimpleSection('paymentMethod', event)
    case 'dias-nao-uteis':
      return await createNonBusinessDay(event)
    default:
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
  }
}

export async function getSectionItem(section: BackofficeSection, id: string) {
  if (section === 'contas-carteiras') {
    return await getAccount(id)
  }

  if (section === 'contatos') {
    return await getContact(id)
  }

  throw createError({ statusCode: 404, statusMessage: 'Detalhe não suportado.' })
}

export async function updateSection(section: BackofficeSection, id: string, event: H3Event) {
  switch (section) {
    case 'categorias':
      return await updateCategory(event, id)
    case 'contas-carteiras':
      return await updateAccount(event, id)
    case 'centros-custo':
      return await updateSimpleSection('costCenter', id, event)
    case 'tags':
      return await updateTag(event, id)
    case 'contatos':
      return await updateContact(event, id)
    case 'formas-pagamento':
      return await updateSimpleSection('paymentMethod', id, event)
    case 'dias-nao-uteis':
      return await updateNonBusinessDay(event, id)
    default:
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
  }
}

export async function deleteSection(section: BackofficeSection, id: string) {
  switch (section) {
    case 'categorias':
      return await deleteCategory(id)
    case 'contas-carteiras':
      return await deleteAccount(id)
    case 'centros-custo':
      return await deleteSimpleSection('costCenter', id)
    case 'tags':
      return await deleteTag(id)
    case 'contatos':
      return await deleteContact(id)
    case 'formas-pagamento':
      return await deleteSimpleSection('paymentMethod', id)
    case 'dias-nao-uteis':
      return await deleteNonBusinessDay(id)
    default:
      throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada.' })
  }
}
