import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContractFormValues } from '~/types/contracts'

const prisma = {
  contract: {
    findFirst: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}

const tx = {
  contract: {
    update: vi.fn(),
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

const { renewContract } = await import('~~/server/utils/contracts')

function createRenewPayload(overrides: Partial<ContractFormValues> = {}): ContractFormValues {
  return {
    title: 'Contrato Renovado',
    clientId: 'contact_1',
    status: 'ACTIVE',
    originalAmount: '1200',
    discountAmount: '10',
    finalAmount: '1080',
    totalHours: '',
    weeklyHours: '',
    startDate: '2026-09-01',
    expectedEndDate: '2026-12-31',
    billingModel: 'CASH',
    billingFrequency: '',
    billingOccurrences: '',
    firstDueDate: '',
    notes: 'Renovação anual',
    externalContractId: '',
    ...overrides,
  }
}

function createContractRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract_new',
    title: 'Contrato Renovado',
    clientId: 'contact_1',
    status: 'ACTIVE',
    originalAmount: 1200,
    discountAmount: 10,
    finalAmount: 1080,
    totalHours: null,
    weeklyHours: null,
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    expectedEndDate: new Date('2026-12-31T00:00:00.000Z'),
    billingModel: 'CASH',
    billingFrequency: null,
    billingOccurrences: null,
    firstDueDate: null,
    paymentConditionId: null,
    paymentCondition: null,
    notes: 'Renovação anual',
    externalContractId: null,
    source: 'LOCAL',
    renewalOfContractId: 'contract_old',
    renewalOf: {
      id: 'contract_old',
      title: 'Contrato Atual',
    },
    renewedBy: [],
    entries: [],
    client: {
      name: 'Pedro Pisandelli',
    },
    createdAt: new Date('2026-08-03T10:00:00.000Z'),
    updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    ...overrides,
  }
}

describe('contract renewal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction.mockImplementation(async callback => await callback(tx))
    prisma.contact.findFirst.mockResolvedValue({ id: 'contact_1' })
  })

  it('creates a new contract and marks the previous one as renewed', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract_old',
      title: 'Contrato Atual',
      status: 'ACTIVE',
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      expectedEndDate: new Date('2026-08-31T00:00:00.000Z'),
    })
    tx.contract.update.mockResolvedValue({})
    tx.contract.create.mockResolvedValue(createContractRecord())

    const result = await renewContract('contract_old', createRenewPayload())

    expect(tx.contract.update).toHaveBeenCalledWith({
      where: { id: 'contract_old' },
      data: { status: 'RENEWED' },
    })
    expect(tx.contract.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: 'Contrato Renovado',
        clientId: 'contact_1',
        status: 'ACTIVE',
        renewalOfContractId: 'contract_old',
        source: 'LOCAL',
      }),
    }))
    expect(result).toMatchObject({
      id: 'contract_new',
      title: 'Contrato Renovado',
      status: 'ACTIVE',
      renewalOfContractId: 'contract_old',
      renewalOfTitle: 'Contrato Atual',
    })
  })

  it('rejects renewal when the previous contract is not active', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract_old',
      title: 'Contrato Atual',
      status: 'CANCELED',
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      expectedEndDate: new Date('2026-08-31T00:00:00.000Z'),
    })

    await expect(renewContract('contract_old', createRenewPayload())).rejects.toMatchObject({
      statusCode: 400,
      message: 'Apenas contratos ativos podem ser renovados.',
    })

    expect(tx.contract.update).not.toHaveBeenCalled()
    expect(tx.contract.create).not.toHaveBeenCalled()
  })

  it('rejects renewal when the new start date overlaps the previous expected end date', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract_old',
      title: 'Contrato Atual',
      status: 'ACTIVE',
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      expectedEndDate: new Date('2026-08-31T00:00:00.000Z'),
    })

    await expect(renewContract('contract_old', createRenewPayload({
      startDate: '2026-08-15',
    }))).rejects.toMatchObject({
      statusCode: 400,
      message: 'A renovação deve começar depois da data prevista de término do contrato anterior.',
    })

    expect(tx.contract.update).not.toHaveBeenCalled()
    expect(tx.contract.create).not.toHaveBeenCalled()
  })
})
