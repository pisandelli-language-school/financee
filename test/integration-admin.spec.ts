import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  integrationClient: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
}
const issueIntegrationToken = vi.fn()

vi.mock('~~/server/utils/prisma', () => ({ prisma }))
vi.mock('~~/server/utils/integrations', () => ({
  INTEGRATION_SCOPES: ['contacts.read', 'contracts.read', 'financial_status.read'],
  issueIntegrationToken,
}))
vi.stubGlobal('createError', (input: { message?: string, statusCode?: number }) => Object.assign(new Error(input.message), input))

const {
  createIntegrationClient,
  issueIntegrationClientToken,
} = await import('~~/server/utils/integration-admin')

describe('integration administration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a normalized client with only supported scopes', async () => {
    prisma.integrationClient.create.mockResolvedValue({
      id: 'client-1', name: 'Classtime', clientId: 'classtime', isActive: true,
      scopes: [{ scopeKey: 'contacts.read' }], credentials: [],
      createdAt: new Date('2026-08-20T12:00:00.000Z'), updatedAt: new Date('2026-08-20T12:00:00.000Z'),
    })

    await expect(createIntegrationClient({ name: ' Classtime ', clientId: 'ct', scopes: ['contacts.read'] })).rejects.toMatchObject({ statusCode: 400 })

    const client = await createIntegrationClient({ name: ' Classtime ', clientId: 'classtime', scopes: ['contacts.read'] })

    expect(prisma.integrationClient.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Classtime', clientId: 'classtime', scopes: { create: [{ scopeKey: 'contacts.read' }] } }),
    }))
    expect(client).toMatchObject({ id: 'client-1', scopes: ['contacts.read'] })
  })

  it('does not issue a token for an unknown integration client', async () => {
    prisma.integrationClient.findUnique.mockResolvedValue(null)
    await expect(issueIntegrationClientToken('missing')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('issues a token using the stored client key', async () => {
    prisma.integrationClient.findUnique.mockResolvedValue({ clientId: 'classtime' })
    issueIntegrationToken.mockResolvedValue({ token: 'jwt' })

    await expect(issueIntegrationClientToken('client-1', 30)).resolves.toEqual({ token: 'jwt' })
    expect(issueIntegrationToken).toHaveBeenCalledWith({ clientId: 'classtime', expiresInDays: 30 })
  })
})
