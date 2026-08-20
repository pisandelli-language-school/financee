import { beforeEach, describe, expect, it, vi } from 'vitest'

const requirePermission = vi.fn()
const prisma = { integrationLog: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() } }
vi.mock('~~/server/utils/auth', () => ({ requirePermission }))
vi.mock('~~/server/utils/prisma', () => ({ prisma }))
vi.stubGlobal('createError', (input: { message?: string, statusCode?: number }) => Object.assign(new Error(input.message), input))
vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler)
vi.stubGlobal('getQuery', vi.fn())
vi.stubGlobal('getRouterParam', vi.fn())

describe('integration logs API', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getQuery).mockReturnValue({}) })

  it('requires integration management permission and applies operational filters', async () => {
    vi.mocked(getQuery).mockReturnValue({ provider: 'integration-api', status: 'success', direction: 'exposed_api', clientId: 'client-1', operation: 'contacts', entityType: 'Contact', dateFrom: '2026-08-01', dateTo: '2026-08-20', page: '2', pageSize: '25' })
    prisma.integrationLog.findMany.mockResolvedValue([])
    prisma.integrationLog.count.mockResolvedValue(0)
    const handler = (await import('~~/server/api/integrations/logs/index.get')).default
    await expect(handler({})).resolves.toMatchObject({ total: 0, page: 2, pageSize: 25 })
    expect(requirePermission).toHaveBeenCalledWith({}, 'integracoes.manage')
    expect(prisma.integrationLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ provider: 'integration-api', clientId: 'client-1', status: 'SUCCESS', direction: 'EXPOSED_API', operation: { contains: 'contacts' }, entityType: { contains: 'Contact' }, createdAt: { gte: new Date('2026-08-01T00:00:00.000Z'), lte: new Date('2026-08-20T23:59:59.999Z') } }),
      skip: 25, take: 25,
    }))
  })

  it('returns the redacted log detail only to authorized administrators', async () => {
    vi.mocked(getRouterParam).mockReturnValue('log-1')
    prisma.integrationLog.findUnique.mockResolvedValue({ id: 'log-1', createdAt: new Date('2026-08-20T12:00:00.000Z'), client: { name: 'Classtime', clientId: 'classtime' }, rawPayload: { authorization: '[REDACTED]' } })
    const handler = (await import('~~/server/api/integrations/logs/[id].get')).default
    await expect(handler({})).resolves.toMatchObject({ id: 'log-1', clientName: 'Classtime', createdAt: '2026-08-20T12:00:00.000Z' })
    expect(requirePermission).toHaveBeenCalledWith({}, 'integracoes.manage')
  })
})
