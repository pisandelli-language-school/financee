import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  contract: {
    findFirst: vi.fn(),
    update: vi.fn(),
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

const { changeContractStatus } = await import('~~/server/utils/contracts')

function createContractRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract_1',
    title: 'Contrato Escola',
    clientId: 'contact_1',
    status: 'ACTIVE',
    originalAmount: 1500,
    discountAmount: null,
    finalAmount: 1500,
    totalHours: null,
    weeklyHours: null,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    expectedEndDate: new Date('2026-12-31T00:00:00.000Z'),
    billingModel: 'CASH',
    billingFrequency: null,
    billingOccurrences: null,
    firstDueDate: null,
    paymentConditionId: null,
    paymentCondition: null,
    notes: null,
    externalContractId: null,
    source: 'LOCAL',
    renewalOfContractId: null,
    renewalOf: null,
    renewedBy: [],
    entries: [],
    client: {
      name: 'Pedro Pisandelli',
    },
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-02T00:00:00.000Z'),
    ...overrides,
  }
}

describe('contract status change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the contract to a valid status and returns normalized record data', async () => {
    prisma.contract.findFirst.mockResolvedValueOnce(createContractRecord())
    prisma.contract.update.mockResolvedValueOnce(createContractRecord({
      status: 'LOCKED',
      updatedAt: new Date('2026-08-03T00:00:00.000Z'),
    }))

    const result = await changeContractStatus('contract_1', 'LOCKED')

    expect(prisma.contract.update).toHaveBeenCalledWith({
      where: { id: 'contract_1' },
      data: {
        status: 'LOCKED',
      },
      include: expect.any(Object),
    })
    expect(result).toMatchObject({
      id: 'contract_1',
      title: 'Contrato Escola',
      status: 'LOCKED',
      startDate: '2026-08-01',
      expectedEndDate: '2026-12-31',
    })
  })

  it('rejects invalid status values before writing to the database', async () => {
    prisma.contract.findFirst.mockResolvedValueOnce(createContractRecord())

    await expect(changeContractStatus('contract_1', 'INVALID' as never)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Selecione um status válido.',
    })

    expect(prisma.contract.update).not.toHaveBeenCalled()
  })
})
