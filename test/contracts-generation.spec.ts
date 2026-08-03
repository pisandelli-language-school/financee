import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  contract: {
    findFirst: vi.fn(),
  },
  account: {
    findFirst: vi.fn(),
  },
  category: {
    findFirst: vi.fn(),
  },
  costCenter: {
    findFirst: vi.fn(),
  },
  paymentMethod: {
    findFirst: vi.fn(),
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

const { generateContractEntries } = await import('~~/server/utils/contracts')

describe('contract entry generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prisma.$transaction.mockImplementation(async callback => await callback(tx))
  })

  it('creates installment entries linked to the contract and client', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract_1',
      clientId: 'contact_1',
      status: 'ACTIVE',
      finalAmount: 300,
      billingModel: 'INSTALLMENT',
      billingFrequency: 'MONTHLY',
      billingOccurrences: 3,
      client: {
        isActive: true,
        roleAssignments: [
          { role: 'CLIENT' },
        ],
      },
      entries: [],
    })
    prisma.account.findFirst.mockResolvedValue({ id: 'account_1' })
    prisma.category.findFirst
      .mockResolvedValueOnce({
        id: 'category_1',
        parentId: null,
        type: 'INCOME',
      })
      .mockResolvedValueOnce({
        id: 'subcategory_1',
        parentId: 'category_1',
        type: 'INCOME',
      })
    prisma.costCenter.findFirst.mockResolvedValue({ id: 'cost_1' })
    prisma.paymentMethod.findFirst.mockResolvedValue({ id: 'payment_1' })
    tx.financialEntry.create
      .mockResolvedValueOnce({ id: 'entry_1' })
      .mockResolvedValueOnce({ id: 'entry_2' })
      .mockResolvedValueOnce({ id: 'entry_3' })

    const result = await generateContractEntries('contract_1', {
      description: 'Mensalidade VIP',
      accountId: 'account_1',
      paymentMethodId: 'payment_1',
      categoryId: 'category_1',
      subcategoryId: 'subcategory_1',
      costCenterId: 'cost_1',
      firstDueDate: '2026-08-10',
      notes: 'Gerado pelo contrato',
    })

    expect(result.count).toBe(3)
    expect(result.firstEntryId).toBe('entry_1')
    expect(result.recurrenceGroupId).toEqual(expect.any(String))
    expect(tx.financialEntry.create).toHaveBeenCalledTimes(3)
    expect(tx.financialEntry.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        direction: 'INCOME',
        description: 'Mensalidade VIP',
        amount: 100,
        contactId: 'contact_1',
        contractId: 'contract_1',
        accountId: 'account_1',
        categoryId: 'category_1',
        subcategoryId: 'subcategory_1',
        costCenterId: 'cost_1',
        paymentMethodId: 'payment_1',
        recurrenceType: 'INSTALLMENT',
        recurrenceFrequency: 'MONTHLY',
        recurrenceIndex: 1,
        recurrenceTotal: 3,
        notes: 'Gerado pelo contrato',
      }),
    }))
    expect(tx.financialEntry.create).toHaveBeenNthCalledWith(3, expect.objectContaining({
      data: expect.objectContaining({
        recurrenceIndex: 3,
        recurrenceTotal: 3,
      }),
    }))
  })

  it('rejects generation when the contract already has linked entries', async () => {
    prisma.contract.findFirst.mockResolvedValue({
      id: 'contract_2',
      clientId: 'contact_2',
      status: 'ACTIVE',
      finalAmount: 500,
      billingModel: 'CASH',
      billingFrequency: null,
      billingOccurrences: null,
      client: {
        isActive: true,
        roleAssignments: [
          { role: 'CLIENT' },
        ],
      },
      entries: [
        { id: 'entry_existing' },
      ],
    })

    await expect(generateContractEntries('contract_2', {
      description: 'Duplicado',
      accountId: 'account_1',
      paymentMethodId: '',
      categoryId: 'category_1',
      subcategoryId: '',
      costCenterId: '',
      firstDueDate: '2026-08-10',
      notes: '',
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Este contrato já possui lançamentos vinculados.',
    })

    expect(prisma.account.findFirst).not.toHaveBeenCalled()
    expect(tx.financialEntry.create).not.toHaveBeenCalled()
  })
})
