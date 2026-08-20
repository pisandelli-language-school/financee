import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { IntegrationDirection, IntegrationStatus } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '~~/server/utils/prisma'

export const INTEGRATION_SCOPES = [
  'contacts.read',
  'contracts.read',
  'financial_status.read',
] as const

export type IntegrationScope = typeof INTEGRATION_SCOPES[number]

const JWT_ALGORITHM = 'HS256'
const JWT_ISSUER = 'financee'
const JWT_AUDIENCE = 'financee-integrations'
const DEFAULT_TOKEN_EXPIRY_DAYS = 90
const MAX_TOKEN_EXPIRY_DAYS = 365

interface IntegrationJwtPayload {
  iss: typeof JWT_ISSUER
  aud: typeof JWT_AUDIENCE
  sub: string
  jti: string
  iat: number
  exp: number
}

interface IntegrationAuthentication {
  clientId: string
  clientKey: string
  credentialId: string
  scopes: string[]
}

interface IssueIntegrationTokenInput {
  clientId: string
  expiresInDays?: number
}

interface LogIntegrationEventInput {
  provider: string
  operation: string
  direction: IntegrationDirection
  status: IntegrationStatus
  requestSummary?: unknown
  responseSummary?: unknown
  rawPayload?: unknown
  errorMessage?: string | null
  entityType?: string | null
  entityId?: string | null
  clientId?: string | null
}

function integrationError(statusCode: number, message: string, code: string): never {
  throw createError({
    statusCode,
    message,
    data: { code },
  })
}

function getJwtSecret() {
  const secret = process.env.INTEGRATION_JWT_SECRET?.trim()

  if (!secret || secret.length < 32) {
    integrationError(500, 'A chave da API de integrações não está configurada.', 'INTEGRATION_JWT_SECRET_MISSING')
  }

  return secret
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signJwtSegment(value: string) {
  return createHmac('sha256', getJwtSecret()).update(value).digest('base64url')
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function signaturesMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)

  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer)
}

function parseJwt(token: string): IntegrationJwtPayload {
  const parts = token.split('.')

  if (parts.length !== 3) {
    integrationError(401, 'Token de integração inválido.', 'INTEGRATION_TOKEN_INVALID')
  }

  const [encodedHeader = '', encodedPayload = '', signature = ''] = parts
  const signedValue = `${encodedHeader}.${encodedPayload}`

  if (!signaturesMatch(signature, signJwtSegment(signedValue))) {
    integrationError(401, 'Token de integração inválido.', 'INTEGRATION_TOKEN_INVALID')
  }

  try {
    const header = JSON.parse(decodeBase64Url(encodedHeader)) as { alg?: string, typ?: string }
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<IntegrationJwtPayload>

    if (header.alg !== JWT_ALGORITHM || header.typ !== 'JWT'
      || payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE
      || !payload.sub || !payload.jti || typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
      integrationError(401, 'Token de integração inválido.', 'INTEGRATION_TOKEN_INVALID')
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      integrationError(401, 'Token de integração expirado.', 'INTEGRATION_TOKEN_EXPIRED')
    }

    return payload as IntegrationJwtPayload
  } catch (error) {
    if (hasIntegrationErrorCode(error)) {
      throw error
    }

    integrationError(401, 'Token de integração inválido.', 'INTEGRATION_TOKEN_INVALID')
  }
}

function hasIntegrationErrorCode(error: unknown): error is { data?: { code?: string } } {
  return Boolean(error && typeof error === 'object' && 'data' in error)
}

function isIntegrationScope(scope: string): scope is IntegrationScope {
  return INTEGRATION_SCOPES.includes(scope as IntegrationScope)
}

function sanitizeText(value: string, key?: string) {
  const normalizedKey = key?.toLowerCase().replaceAll(/[^a-z0-9]/g, '') ?? ''

  if (/authorization|cookie|token|secret|password|apikey|card|cvv/.test(normalizedKey)) {
    return '[REDACTED]'
  }

  if (/cpf|cnpj|document/.test(normalizedKey)) {
    return value.replace(/\d/g, '*')
  }

  if (/email/.test(normalizedKey)) {
    return value.replace(/^(.).*(@.*)$/, '$1***$2')
  }

  if (/phone|telefone/.test(normalizedKey)) {
    return value.replace(/\d(?=\d{2})/g, '*')
  }

  return value
    .replace(/\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g, '[REDACTED_DOCUMENT]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]')
}

export function sanitizeIntegrationPayload(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    return sanitizeText(value, key)
  }

  if (Array.isArray(value)) {
    return value.map(entry => sanitizeIntegrationPayload(entry, key))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeIntegrationPayload(entryValue, entryKey),
      ]),
    )
  }

  return value
}

function toJsonValue(value: unknown) {
  if (value == null) {
    return Prisma.JsonNull
  }

  return sanitizeIntegrationPayload(value) as Prisma.InputJsonValue
}

export async function issueIntegrationToken(input: IssueIntegrationTokenInput) {
  const expiresInDays = input.expiresInDays ?? DEFAULT_TOKEN_EXPIRY_DAYS

  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > MAX_TOKEN_EXPIRY_DAYS) {
    integrationError(400, 'A validade do token deve estar entre 1 e 365 dias.', 'INTEGRATION_TOKEN_EXPIRY_INVALID')
  }

  const client = await prisma.integrationClient.findUnique({
    where: { clientId: input.clientId },
    select: {
      id: true,
      clientId: true,
      isActive: true,
    },
  })

  if (!client || !client.isActive) {
    integrationError(404, 'Cliente de integração ativo não encontrado.', 'INTEGRATION_CLIENT_NOT_FOUND')
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = new Date((issuedAt + expiresInDays * 24 * 60 * 60) * 1000)
  const payload: IntegrationJwtPayload = {
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    sub: client.id,
    jti: randomUUID(),
    iat: issuedAt,
    exp: Math.floor(expiresAt.getTime() / 1000),
  }
  const encodedHeader = encodeBase64Url(JSON.stringify({ alg: JWT_ALGORITHM, typ: 'JWT' }))
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signedValue = `${encodedHeader}.${encodedPayload}`
  const token = `${signedValue}.${signJwtSegment(signedValue)}`

  const credential = await prisma.integrationClientCredential.create({
    data: {
      clientId: client.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  })

  return {
    token,
    clientId: client.clientId,
    credentialId: credential.id,
    expiresAt: credential.expiresAt,
  }
}

export async function validateIntegrationToken(token: string): Promise<IntegrationAuthentication> {
  const payload = parseJwt(token)
  const credential = await prisma.integrationClientCredential.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      clientId: true,
      expiresAt: true,
      revokedAt: true,
      client: {
        select: {
          id: true,
          clientId: true,
          isActive: true,
          scopes: {
            select: { scopeKey: true },
          },
        },
      },
    },
  })

  if (!credential || credential.clientId !== payload.sub || credential.revokedAt || credential.expiresAt <= new Date() || !credential.client.isActive) {
    integrationError(401, 'Token de integração não está ativo.', 'INTEGRATION_TOKEN_INACTIVE')
  }

  await prisma.integrationClientCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  })

  return {
    clientId: credential.client.id,
    clientKey: credential.client.clientId,
    credentialId: credential.id,
    scopes: credential.client.scopes.map(scope => scope.scopeKey),
  }
}

export async function requireIntegrationAuthentication(event: H3Event, scope: IntegrationScope) {
  const authorization = getHeader(event, 'authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

  if (!token) {
    integrationError(401, 'Token Bearer de integração ausente.', 'INTEGRATION_TOKEN_MISSING')
  }

  const authentication = await validateIntegrationToken(token)
  requireIntegrationScope(authentication, scope)
  return authentication
}

export function requireIntegrationScope(authentication: IntegrationAuthentication, scope: IntegrationScope) {
  if (!isIntegrationScope(scope) || !authentication.scopes.includes(scope)) {
    integrationError(403, 'Cliente de integração sem o escopo necessário.', 'INTEGRATION_SCOPE_MISSING')
  }
}

export async function logIntegrationEvent(input: LogIntegrationEventInput) {
  return await prisma.integrationLog.create({
    data: {
      provider: input.provider,
      operation: input.operation,
      direction: input.direction,
      status: input.status,
      requestSummary: toJsonValue(input.requestSummary),
      responseSummary: toJsonValue(input.responseSummary),
      rawPayload: toJsonValue(input.rawPayload),
      errorMessage: input.errorMessage ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      clientId: input.clientId ?? null,
    },
  })
}
