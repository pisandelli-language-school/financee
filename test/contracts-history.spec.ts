import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  contract: {
    findFirst: vi.fn(),
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

const { getContractHistory } = await import('~~/server/utils/contracts')

function createHistoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract_current',
    title: 'Contrato Atual',
    status: 'ACTIVE',
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    expectedEndDate: new Date('2026-12-31T00:00:00.000Z'),
    renewalOfContractId: null,
    renewedBy: [],
    ...overrides,
  }
}

describe('contract history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns previous, current and next contracts in chronological chain order', async () => {
    prisma.contract.findFirst
      .mockResolvedValueOnce(createHistoryRecord({
        id: 'contract_current',
        title: 'Contrato Atual',
        renewalOfContractId: 'contract_previous',
      }))
      .mockResolvedValueOnce(createHistoryRecord({
        id: 'contract_previous',
        title: 'Contrato Anterior',
        status: 'RENEWED',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        expectedEndDate: new Date('2026-07-31T00:00:00.000Z'),
        renewalOfContractId: null,
      }))
      .mockResolvedValueOnce(createHistoryRecord({
        id: 'contract_next',
        title: 'Contrato Renovado',
        status: 'ACTIVE',
        startDate: new Date('2027-01-01T00:00:00.000Z'),
        expectedEndDate: new Date('2027-06-30T00:00:00.000Z'),
      }))
      .mockResolvedValueOnce(null)

    const result = await getContractHistory('contract_current')

    expect(result.items).toEqual([
      {
        id: 'contract_previous',
        title: 'Contrato Anterior',
        status: 'RENEWED',
        startDate: '2026-01-01',
        expectedEndDate: '2026-07-31',
        relation: 'PREVIOUS',
      },
      {
        id: 'contract_current',
        title: 'Contrato Atual',
        status: 'ACTIVE',
        startDate: '2026-08-01',
        expectedEndDate: '2026-12-31',
        relation: 'CURRENT',
      },
      {
        id: 'contract_next',
        title: 'Contrato Renovado',
        status: 'ACTIVE',
        startDate: '2027-01-01',
        expectedEndDate: '2027-06-30',
        relation: 'NEXT',
      },
    ])
  })

  it('stops gracefully when a broken previous link cannot be resolved', async () => {
    prisma.contract.findFirst
      .mockResolvedValueOnce(createHistoryRecord({
        id: 'contract_current',
        title: 'Contrato Atual',
        renewalOfContractId: 'missing_previous',
      }))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const result = await getContractHistory('contract_current')

    expect(result.items).toEqual([
      {
        id: 'contract_current',
        title: 'Contrato Atual',
        status: 'ACTIVE',
        startDate: '2026-08-01',
        expectedEndDate: '2026-12-31',
        relation: 'CURRENT',
      },
    ])
  })

  it('returns 404 when the root contract does not exist', async () => {
    prisma.contract.findFirst.mockResolvedValueOnce(null)

    await expect(getContractHistory('missing_contract')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Contrato não encontrado.',
    })
  })
})
