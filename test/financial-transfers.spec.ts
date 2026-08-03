import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  account: {
    findFirst: vi.fn(),
  },
  financialEntry: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}

const tx = {
  financialEntry: {
    create: vi.fn(),
  },
}

vi.mock('~~/server/utils/prisma', () => ({
  prisma,
}))

vi.mock('~~/server/utils/financial-calendar', () => ({
  resolveEffectiveDueDate: vi.fn(async (date: Date) => date),
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
  createFinancialEntry,
  markFinancialEntryAsOpen,
  markFinancialEntryAsPaid,
} = await import('~~/server/utils/financial')

function createRelatedEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry_1',
    direction: 'EXPENSE',
    type: 'TRANSFER',
    status: 'OPEN',
    description: 'Transferência para reserva',
    amount: 250,
    competenceDate: new Date('2026-08-03T00:00:00.000Z'),
    scheduledDueDate: new Date('2026-08-03T00:00:00.000Z'),
    effectiveDueDate: new Date('2026-08-03T00:00:00.000Z'),
    paymentDate: null,
    accountId: 'account_origin',
    account: {
      name: 'Conta origem',
      institution: {
        name: 'Banco Azul',
        logoKey: 'banco-azul',
      },
    },
    paymentAccountId: null,
    paymentAccount: null,
    paymentMethodId: null,
    paymentMethod: null,
    categoryId: null,
    category: null,
    subcategoryId: null,
    subcategory: null,
    costCenterId: null,
    costCenter: null,
    contactId: null,
    contact: null,
    recurrenceType: 'ONE_TIME',
    recurrenceFrequency: null,
    recurrenceGroupId: null,
    recurrenceIndex: null,
    recurrenceTotal: null,
    transferGroupId: 'transfer_group_1',
    notes: 'Movimentação interna',
    tags: [],
    createdAt: new Date('2026-08-03T10:00:00.000Z'),
    updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    ...overrides,
  }
}

describe('financial transfers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction.mockImplementation(async callback => await callback(tx))
  })

  it('creates paired transfer entries for origin and target accounts', async () => {
    prisma.account.findFirst
      .mockResolvedValueOnce({ id: 'account_origin' })
      .mockResolvedValueOnce({ id: 'account_target' })
    tx.financialEntry.create
      .mockResolvedValueOnce(createRelatedEntry())
      .mockResolvedValueOnce(createRelatedEntry({
        id: 'entry_2',
        direction: 'INCOME',
        accountId: 'account_target',
        account: {
          name: 'Conta destino',
          institution: {
            name: 'Banco Verde',
            logoKey: 'banco-verde',
          },
        },
      }))

    const result = await createFinancialEntry({
      direction: 'EXPENSE',
      type: 'TRANSFER',
      description: 'Transferência para reserva',
      amount: '250',
      competenceDate: '2026-08-03',
      scheduledDueDate: '2026-08-03',
      accountId: 'account_origin',
      transferTargetAccountId: 'account_target',
      paymentMethodId: '',
      categoryId: '',
      subcategoryId: '',
      costCenterId: '',
      contactId: '',
      tagIds: [],
      recurrenceType: 'ONE_TIME',
      recurrenceFrequency: '',
      recurrenceTotal: '',
      notes: 'Movimentação interna',
    })

    expect(tx.financialEntry.create).toHaveBeenCalledTimes(2)
    expect(tx.financialEntry.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        direction: 'EXPENSE',
        type: 'TRANSFER',
        accountId: 'account_origin',
        transferGroupId: expect.any(String),
      }),
    }))
    expect(tx.financialEntry.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({
        direction: 'INCOME',
        type: 'TRANSFER',
        accountId: 'account_target',
        transferGroupId: expect.any(String),
      }),
    }))
    expect(result).toMatchObject({
      type: 'TRANSFER',
      direction: 'EXPENSE',
      accountId: 'account_origin',
    })
  })

  it('marks both sides of a transfer as paid together', async () => {
    prisma.financialEntry.findFirst.mockResolvedValueOnce({
      id: 'entry_1',
      status: 'OPEN',
      transferGroupId: 'transfer_group_1',
    })
    prisma.financialEntry.findMany.mockResolvedValue([
      {
        id: 'entry_1',
        accountId: 'account_origin',
        status: 'OPEN',
      },
      {
        id: 'entry_2',
        accountId: 'account_target',
        status: 'OPEN',
      },
    ])
    prisma.$transaction.mockResolvedValue(undefined)
    prisma.financialEntry.findFirst.mockResolvedValueOnce(createRelatedEntry({
      status: 'PAID',
      paymentDate: new Date('2026-08-05T00:00:00.000Z'),
      paymentAccountId: 'account_origin',
    }))

    const result = await markFinancialEntryAsPaid('entry_1', {
      paymentDate: '2026-08-05',
    })

    expect(prisma.financialEntry.findMany).toHaveBeenCalledWith({
      where: {
        transferGroupId: 'transfer_group_1',
        deletedAt: null,
      },
    })
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(result).toMatchObject({
      id: 'entry_1',
      status: 'PAID',
      paymentDate: '2026-08-05',
    })
  })

  it('reopens both sides of a paid transfer together', async () => {
    prisma.financialEntry.findFirst.mockResolvedValueOnce({
      id: 'entry_1',
      status: 'PAID',
      transferGroupId: 'transfer_group_1',
    })
    prisma.financialEntry.updateMany.mockResolvedValue({ count: 2 })
    prisma.financialEntry.findFirst.mockResolvedValueOnce(createRelatedEntry({
      status: 'OPEN',
      paymentDate: null,
      paymentAccountId: null,
    }))

    const result = await markFinancialEntryAsOpen('entry_1')

    expect(prisma.financialEntry.updateMany).toHaveBeenCalledWith({
      where: {
        transferGroupId: 'transfer_group_1',
        deletedAt: null,
      },
      data: {
        status: 'OPEN',
        paymentDate: null,
        paymentAccountId: null,
      },
    })
    expect(result).toMatchObject({
      id: 'entry_1',
      status: 'OPEN',
      paymentDate: null,
    })
  })
})
