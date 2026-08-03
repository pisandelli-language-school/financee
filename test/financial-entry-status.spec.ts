import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  financialEntry: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  account: {
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

const {
  markFinancialEntryAsPaid,
  markFinancialEntryAsOpen,
} = await import('~~/server/utils/financial')

function createEntryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    direction: 'EXPENSE',
    type: 'NORMAL',
    status: 'OPEN',
    description: 'Mensalidade do sistema',
    amount: 100,
    competenceDate: new Date('2026-08-10T00:00:00.000Z'),
    scheduledDueDate: new Date('2026-08-10T00:00:00.000Z'),
    effectiveDueDate: new Date('2026-08-10T00:00:00.000Z'),
    paymentDate: null,
    accountId: 'account_1',
    account: {
      name: 'Conta principal',
      institution: {
        name: 'Banco Inter',
        logoKey: 'inter',
      },
    },
    paymentAccountId: null,
    paymentAccount: null,
    paymentMethodId: null,
    paymentMethod: null,
    categoryId: 'category_1',
    category: {
      name: 'Mensalidades',
    },
    subcategoryId: null,
    subcategory: null,
    costCenterId: null,
    costCenter: null,
    contactId: 'contact_1',
    contact: {
      name: 'Pedro Pisandelli',
    },
    tags: [],
    recurrenceType: 'ONE_TIME',
    recurrenceFrequency: null,
    recurrenceGroupId: null,
    recurrenceIndex: null,
    recurrenceTotal: null,
    transferGroupId: null,
    notes: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

describe('financial entry status actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks a regular entry as paid using the informed payment account', async () => {
    prisma.financialEntry.findFirst.mockResolvedValueOnce(createEntryRecord())
    prisma.account.findFirst.mockResolvedValue({
      id: 'account_payment_1',
    })
    prisma.financialEntry.update.mockResolvedValue(createEntryRecord({
      status: 'PAID',
      paymentDate: new Date('2026-08-12T00:00:00.000Z'),
      paymentAccountId: 'account_payment_1',
      paymentAccount: {
        name: 'Conta caixa',
        institution: {
          name: 'Nubank',
          logoKey: 'nubank',
        },
      },
    }))

    const result = await markFinancialEntryAsPaid('entry-1', {
      paymentDate: '2026-08-12',
      paymentAccountId: 'account_payment_1',
    })

    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'account_payment_1',
        deletedAt: null,
        isActive: true,
      },
    })
    expect(prisma.financialEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'entry-1',
      },
      data: {
        status: 'PAID',
        paymentDate: new Date('2026-08-12T00:00:00.000Z'),
        paymentAccountId: 'account_payment_1',
      },
    }))
    expect(result).toMatchObject({
      id: 'entry-1',
      status: 'PAID',
      paymentDate: '2026-08-12',
      paymentAccountId: 'account_payment_1',
    })
  })

  it('reopens a regular paid entry and clears payment links', async () => {
    prisma.financialEntry.findFirst.mockResolvedValueOnce(createEntryRecord({
      status: 'PAID',
      paymentDate: new Date('2026-08-12T00:00:00.000Z'),
      paymentAccountId: 'account_payment_1',
      paymentAccount: {
        name: 'Conta caixa',
        institution: {
          name: 'Nubank',
          logoKey: 'nubank',
        },
      },
    }))
    prisma.financialEntry.update.mockResolvedValue(createEntryRecord({
      status: 'OPEN',
      paymentDate: null,
      paymentAccountId: null,
      paymentAccount: null,
    }))

    const result = await markFinancialEntryAsOpen('entry-1')

    expect(prisma.financialEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'entry-1',
      },
      data: {
        status: 'OPEN',
        paymentDate: null,
        paymentAccountId: null,
      },
    }))
    expect(result).toMatchObject({
      id: 'entry-1',
      status: 'OPEN',
      paymentDate: null,
      paymentAccountId: null,
    })
  })

  it('blocks payment for canceled entries', async () => {
    prisma.financialEntry.findFirst.mockResolvedValueOnce(createEntryRecord({
      status: 'CANCELED',
    }))

    await expect(markFinancialEntryAsPaid('entry-1', {
      paymentDate: '2026-08-12',
      paymentAccountId: '',
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Não é possível pagar um lançamento cancelado.',
    })

    expect(prisma.account.findFirst).not.toHaveBeenCalled()
    expect(prisma.financialEntry.update).not.toHaveBeenCalled()
  })
})
