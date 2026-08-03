import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  financialEntry: {
    findMany: vi.fn(),
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

const { generateCashFlow } = await import('~~/server/utils/reporting')

describe('cash flow reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('separates paid and open entries according to the selected regime', async () => {
    prisma.financialEntry.findMany
      .mockResolvedValueOnce([
        {
          direction: 'INCOME',
          amount: 1000,
          competenceDate: new Date('2026-07-03T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-05T00:00:00.000Z'),
          paymentDate: new Date('2026-07-06T00:00:00.000Z'),
        },
        {
          direction: 'EXPENSE',
          amount: 250,
          competenceDate: new Date('2026-07-10T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-12T00:00:00.000Z'),
          paymentDate: new Date('2026-07-14T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          direction: 'INCOME',
          amount: 500,
          competenceDate: new Date('2026-08-01T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-08-02T00:00:00.000Z'),
          paymentDate: null,
        },
        {
          direction: 'EXPENSE',
          amount: 300,
          competenceDate: new Date('2026-07-20T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-22T00:00:00.000Z'),
          paymentDate: null,
        },
      ])

    const report = await generateCashFlow({
      regime: 'CASH',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-31',
    })

    expect(prisma.financialEntry.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        status: 'PAID',
        paymentDate: expect.any(Object),
      }),
    }))
    expect(prisma.financialEntry.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        status: 'OPEN',
        effectiveDueDate: expect.any(Object),
      }),
    }))
    expect(report.buckets).toMatchObject([
      {
        periodKey: '2026-07',
        realizedIncome: 1000,
        realizedExpense: 250,
        projectedIncome: 0,
        projectedExpense: 300,
      },
      {
        periodKey: '2026-08',
        realizedIncome: 0,
        realizedExpense: 0,
        projectedIncome: 500,
        projectedExpense: 0,
      },
    ])
    expect(report.totals).toEqual({
      realizedIncome: 1000,
      realizedExpense: 250,
      realizedNet: 750,
      projectedIncome: 500,
      projectedExpense: 300,
      projectedNet: 200,
    })
  })
})
