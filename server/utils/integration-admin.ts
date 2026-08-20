import type { IntegrationScope } from '~~/server/utils/integrations'
import { INTEGRATION_SCOPES, issueIntegrationToken } from '~~/server/utils/integrations'
import { prisma } from '~~/server/utils/prisma'

interface IntegrationClientInput {
  name: string
  clientId: string
  scopes: string[]
  isActive?: boolean
}

function invalidInput(message: string): never {
  throw createError({ statusCode: 400, message })
}

function normalizeScopes(scopes: string[]) {
  const uniqueScopes = [...new Set(scopes.map(scope => scope.trim()))]

  if (!uniqueScopes.length || uniqueScopes.some(scope => !INTEGRATION_SCOPES.includes(scope as IntegrationScope))) {
    invalidInput('Selecione ao menos um escopo de integração válido.')
  }

  return uniqueScopes
}

function normalizeInput(input: IntegrationClientInput) {
  const name = input.name.trim()
  const clientId = input.clientId.trim().toLowerCase()

  if (!name) {
    invalidInput('Nome do cliente é obrigatório.')
  }

  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(clientId)) {
    invalidInput('Client ID deve ter de 3 a 64 caracteres minúsculos, números, hífen ou sublinhado.')
  }

  return {
    name,
    clientId,
    scopes: normalizeScopes(input.scopes),
    isActive: input.isActive ?? true,
  }
}

function serializeClient(client: {
  id: string
  name: string
  clientId: string
  isActive: boolean
  scopes: Array<{ scopeKey: string }>
  credentials: Array<{ id: string, expiresAt: Date, revokedAt: Date | null, lastUsedAt: Date | null }>
  createdAt: Date
  updatedAt: Date
}) {
  const activeCredential = client.credentials[0] ?? null

  return {
    id: client.id,
    name: client.name,
    clientId: client.clientId,
    isActive: client.isActive,
    scopes: client.scopes.map(scope => scope.scopeKey),
    activeCredential: activeCredential && !activeCredential.revokedAt
      ? {
          id: activeCredential.id,
          expiresAt: activeCredential.expiresAt.toISOString(),
          lastUsedAt: activeCredential.lastUsedAt?.toISOString() ?? null,
        }
      : null,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }
}

const clientInclude = {
  scopes: { orderBy: { scopeKey: 'asc' } },
  credentials: {
    where: { revokedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} as const

export async function listIntegrationClients() {
  const clients = await prisma.integrationClient.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: clientInclude,
  })

  return clients.map(serializeClient)
}

export async function createIntegrationClient(input: IntegrationClientInput) {
  const normalized = normalizeInput(input)
  const client = await prisma.integrationClient.create({
    data: {
      name: normalized.name,
      clientId: normalized.clientId,
      isActive: normalized.isActive,
      scopes: { create: normalized.scopes.map(scopeKey => ({ scopeKey })) },
    },
    include: clientInclude,
  })

  return serializeClient(client)
}

export async function updateIntegrationClient(id: string, input: IntegrationClientInput) {
  const normalized = normalizeInput(input)
  const client = await prisma.integrationClient.update({
    where: { id },
    data: {
      name: normalized.name,
      clientId: normalized.clientId,
      isActive: normalized.isActive,
      scopes: {
        deleteMany: {},
        create: normalized.scopes.map(scopeKey => ({ scopeKey })),
      },
    },
    include: clientInclude,
  })

  return serializeClient(client)
}

export async function issueIntegrationClientToken(id: string, expiresInDays?: number) {
  const client = await prisma.integrationClient.findUnique({
    where: { id },
    select: { clientId: true },
  })

  if (!client) {
    throw createError({ statusCode: 404, message: 'Cliente de integração não encontrado.' })
  }

  return await issueIntegrationToken({
    clientId: client.clientId,
    expiresInDays,
  })
}
