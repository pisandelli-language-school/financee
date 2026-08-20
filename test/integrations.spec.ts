import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  integrationClient: {
    findUnique: vi.fn(),
  },
  integrationClientCredential: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  integrationLog: {
    create: vi.fn(),
  },
}

vi.mock('~~/server/utils/prisma', () => ({
  prisma,
}))

vi.stubGlobal('createError', (input: { message?: string, statusCode?: number, data?: unknown }) => {
  const error = new Error(input.message ?? 'Erro')
  Object.assign(error, {
    statusCode: input.statusCode,
    data: input.data,
  })
  return error
})

const {
  issueIntegrationToken,
  logIntegrationEvent,
  requireIntegrationScope,
  validateIntegrationToken,
} = await import('~~/server/utils/integrations')

describe('integration service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))
    process.env.INTEGRATION_JWT_SECRET = 'a-local-secret-with-at-least-thirty-two-characters'
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.INTEGRATION_JWT_SECRET
  })

  it('issues a short-lived, server-revocable JWT for an active client', async () => {
    prisma.integrationClient.findUnique.mockResolvedValue({
      id: 'client-internal-1',
      clientId: 'classtime',
      isActive: true,
    })
    prisma.integrationClientCredential.create.mockResolvedValue({
      id: 'credential-1',
      expiresAt: new Date('2026-11-18T12:00:00.000Z'),
    })

    const issued = await issueIntegrationToken({ clientId: 'classtime' })

    expect(issued).toMatchObject({
      clientId: 'classtime',
      credentialId: 'credential-1',
      expiresAt: new Date('2026-11-18T12:00:00.000Z'),
    })
    expect(issued.token.split('.')).toHaveLength(3)
    expect(prisma.integrationClientCredential.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        clientId: 'client-internal-1',
        expiresAt: new Date('2026-11-18T12:00:00.000Z'),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    }))
  })

  it('rejects a token that has been revoked even when its signature is valid', async () => {
    prisma.integrationClient.findUnique.mockResolvedValue({
      id: 'client-internal-1',
      clientId: 'classtime',
      isActive: true,
    })
    prisma.integrationClientCredential.create.mockResolvedValue({
      id: 'credential-1',
      expiresAt: new Date('2026-11-18T12:00:00.000Z'),
    })
    const issued = await issueIntegrationToken({ clientId: 'classtime' })
    prisma.integrationClientCredential.findUnique.mockResolvedValue({
      id: 'credential-1',
      clientId: 'client-internal-1',
      expiresAt: new Date('2026-11-18T12:00:00.000Z'),
      revokedAt: new Date('2026-08-21T12:00:00.000Z'),
      client: {
        id: 'client-internal-1',
        clientId: 'classtime',
        isActive: true,
        scopes: [{ scopeKey: 'contacts.read' }],
      },
    })

    await expect(validateIntegrationToken(issued.token)).rejects.toMatchObject({
      statusCode: 401,
      data: { code: 'INTEGRATION_TOKEN_INACTIVE' },
    })
  })

  it('rejects an expired token before consulting its credential', async () => {
    prisma.integrationClient.findUnique.mockResolvedValue({
      id: 'client-internal-1',
      clientId: 'classtime',
      isActive: true,
    })
    prisma.integrationClientCredential.create.mockResolvedValue({
      id: 'credential-1',
      expiresAt: new Date('2026-11-18T12:00:00.000Z'),
    })
    const issued = await issueIntegrationToken({ clientId: 'classtime' })
    vi.setSystemTime(new Date('2026-11-18T12:00:00.000Z'))

    await expect(validateIntegrationToken(issued.token)).rejects.toMatchObject({
      statusCode: 401,
      data: { code: 'INTEGRATION_TOKEN_EXPIRED' },
    })
    expect(prisma.integrationClientCredential.findUnique).not.toHaveBeenCalled()
  })

  it('updates last use and permits only granted scopes', async () => {
    prisma.integrationClient.findUnique.mockResolvedValue({
      id: 'client-internal-1',
      clientId: 'classtime',
      isActive: true,
    })
    prisma.integrationClientCredential.create.mockResolvedValue({
      id: 'credential-1',
      expiresAt: new Date('2026-11-18T12:00:00.000Z'),
    })
    const issued = await issueIntegrationToken({ clientId: 'classtime' })
    prisma.integrationClientCredential.findUnique.mockResolvedValue({
      id: 'credential-1',
      clientId: 'client-internal-1',
      expiresAt: new Date('2026-11-18T12:00:00.000Z'),
      revokedAt: null,
      client: {
        id: 'client-internal-1',
        clientId: 'classtime',
        isActive: true,
        scopes: [{ scopeKey: 'contacts.read' }],
      },
    })

    const authentication = await validateIntegrationToken(issued.token)
    requireIntegrationScope(authentication, 'contacts.read')

    expect(prisma.integrationClientCredential.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'credential-1' },
      data: { lastUsedAt: new Date('2026-08-20T12:00:00.000Z') },
    }))
    expect(() => requireIntegrationScope(authentication, 'contracts.read')).toThrow(expect.objectContaining({
      data: { code: 'INTEGRATION_SCOPE_MISSING' },
    }))
  })

  it('redacts sensitive values before persisting an integration log', async () => {
    prisma.integrationLog.create.mockResolvedValue({ id: 'log-1' })

    await logIntegrationEvent({
      provider: 'integration-api',
      operation: 'contacts.list',
      direction: 'EXPOSED_API',
      status: 'SUCCESS',
      requestSummary: {
        authorization: 'Bearer should-not-be-stored',
        email: 'ana@example.com',
      },
      rawPayload: {
        cpf: '123.456.789-09',
        cardNumber: '4111111111111111',
      },
    })

    expect(prisma.integrationLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requestSummary: {
          authorization: '[REDACTED]',
          email: 'a***@example.com',
        },
        rawPayload: {
          cpf: '***.***.***-**',
          cardNumber: '[REDACTED]',
        },
      }),
    }))
  })
})
