import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  contact: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  contract: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}

const logIntegrationEvent = vi.fn()
const requireIntegrationAuthentication = vi.fn()

vi.mock('~~/server/utils/prisma', () => ({ prisma }))
vi.mock('~~/server/utils/integrations', () => ({
  logIntegrationEvent,
  requireIntegrationAuthentication,
}))

vi.stubGlobal('createError', (input: { message?: string, statusCode?: number, data?: unknown }) => {
  const error = new Error(input.message ?? 'Erro')
  Object.assign(error, {
    statusCode: input.statusCode,
    data: input.data,
  })
  return error
})
vi.stubGlobal('getQuery', vi.fn())

const {
  getIntegrationContract,
  listIntegrationContacts,
  listIntegrationContracts,
} = await import('~~/server/utils/integration-consumer-api')

describe('integration consumer API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getQuery).mockReturnValue({})
    requireIntegrationAuthentication.mockResolvedValue({
      clientId: 'integration-client-1',
      clientKey: 'classtime',
    })
    logIntegrationEvent.mockResolvedValue({ id: 'log-1' })
  })

  it('lists contacts with bounded pagination and a sanitized operational log', async () => {
    vi.mocked(getQuery).mockReturnValue({ page: '2', pageSize: '999' })
    prisma.contact.findMany.mockResolvedValue([
      {
        id: 'contact-1',
        name: 'Ana Silva',
        tradeName: null,
        document: '12345678909',
        documentType: 'CPF',
        nature: 'INDIVIDUAL',
        birthDate: new Date('1990-01-02T00:00:00.000Z'),
        municipalRegistration: null,
        email: 'ana@example.com',
        phone: '85999999999',
        address: null,
        financialResponsible: null,
        roleAssignments: [{ role: 'CLIENT' }],
        isActive: true,
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        updatedAt: new Date('2026-08-20T10:00:00.000Z'),
      },
    ])
    prisma.contact.count.mockResolvedValue(101)

    const response = await listIntegrationContacts({} as never)

    expect(requireIntegrationAuthentication).toHaveBeenCalledWith({}, 'contacts.read')
    expect(prisma.contact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: null },
      skip: 100,
      take: 100,
    }))
    expect(response).toEqual(expect.objectContaining({
      page: 2,
      pageSize: 100,
      total: 101,
      items: [expect.objectContaining({
        id: 'contact-1',
        birthDate: '1990-01-02',
        createdAt: '2026-08-01T10:00:00.000Z',
      })],
    }))
    expect(logIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'contacts.list',
      status: 'SUCCESS',
      clientId: 'integration-client-1',
      requestSummary: { clientKey: 'classtime' },
      responseSummary: { itemCount: 1, total: 101 },
    }))
  })

  it('does not query contacts without the required integration scope', async () => {
    requireIntegrationAuthentication.mockRejectedValue(Object.assign(new Error('Sem escopo'), {
      statusCode: 403,
    }))

    await expect(listIntegrationContacts({} as never)).rejects.toMatchObject({ statusCode: 403 })

    expect(prisma.contact.findMany).not.toHaveBeenCalled()
    expect(logIntegrationEvent).not.toHaveBeenCalled()
  })

  it('exposes contracts read-only and records an entity-specific detail lookup', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract-1',
      title: 'Curso de inglês',
      clientId: 'contact-1',
      status: 'ACTIVE',
      originalAmount: { toString: () => '1200.00' },
      discountAmount: { toString: () => '10.00' },
      finalAmount: { toString: () => '1080.00' },
      totalHours: 40,
      weeklyHours: 2,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      expectedEndDate: null,
      billingModel: 'INSTALLMENT',
      billingFrequency: 'MONTHLY',
      billingOccurrences: 3,
      firstDueDate: new Date('2026-08-10T00:00:00.000Z'),
      source: 'LOCAL',
      externalContractId: null,
      renewalOfContractId: null,
      client: { id: 'contact-1', name: 'Ana Silva', tradeName: null },
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-20T10:00:00.000Z'),
    })

    const response = await getIntegrationContract({} as never, 'contract-1')

    expect(requireIntegrationAuthentication).toHaveBeenCalledWith({}, 'contracts.read')
    expect(prisma.contract.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'contract-1', deletedAt: null },
    }))
    expect(response).toMatchObject({
      id: 'contract-1',
      originalAmount: 1200,
      finalAmount: 1080,
      startDate: '2026-08-01',
    })
    expect(logIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'contracts.get',
      entityType: 'Contract',
      entityId: 'contract-1',
      responseSummary: { entityType: 'Contract', entityId: 'contract-1' },
    }))
  })

  it('keeps contract list data behind the contracts scope', async () => {
    prisma.contract.findMany.mockResolvedValue([])
    prisma.contract.count.mockResolvedValue(0)

    await expect(listIntegrationContracts({} as never)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    expect(requireIntegrationAuthentication).toHaveBeenCalledWith({}, 'contracts.read')
  })
})
