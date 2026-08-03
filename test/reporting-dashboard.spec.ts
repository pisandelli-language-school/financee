import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  contract: {
    count: vi.fn(),
  },
  financialEntry: {
    findMany: vi.fn(),
    count: vi.fn(),
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
  generateFinancialDashboard,
  generateOperationalDashboard,
} = await import('~~/server/utils/reporting')

describe('reporting dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('combines cash flow and delinquency into the financial dashboard cards', async () => {
    prisma.financialEntry.findMany
      .mockResolvedValueOnce([
        {
          direction: 'INCOME',
          amount: 1200,
          competenceDate: new Date('2026-07-05T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-07T00:00:00.000Z'),
          paymentDate: new Date('2026-07-08T00:00:00.000Z'),
        },
        {
          direction: 'EXPENSE',
          amount: 200,
          competenceDate: new Date('2026-07-10T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-10T00:00:00.000Z'),
          paymentDate: new Date('2026-07-11T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          direction: 'INCOME',
          amount: 300,
          competenceDate: new Date('2026-07-18T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-20T00:00:00.000Z'),
          paymentDate: null,
        },
        {
          direction: 'EXPENSE',
          amount: 100,
          competenceDate: new Date('2026-07-21T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-23T00:00:00.000Z'),
          paymentDate: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'entry_1',
          description: 'Mensalidade Pedro',
          amount: 400,
          scheduledDueDate: new Date('2026-07-01T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-10T00:00:00.000Z'),
          contact: { name: 'Pedro Pisandelli' },
          account: { name: 'Conta Escola' },
        },
        {
          id: 'entry_2',
          description: 'Mensalidade Hatus',
          amount: 150,
          scheduledDueDate: new Date('2026-07-05T00:00:00.000Z'),
          effectiveDueDate: new Date('2026-07-20T00:00:00.000Z'),
          contact: { name: 'Hatus Rodrigues' },
          account: { name: 'Conta Escola' },
        },
      ])

    const dashboard = await generateFinancialDashboard({
      regime: 'CASH',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(prisma.financialEntry.findMany).toHaveBeenCalledTimes(3)
    expect(dashboard.cashFlowTotals).toEqual({
      realizedIncome: 1200,
      realizedExpense: 200,
      realizedNet: 1000,
      projectedIncome: 300,
      projectedExpense: 100,
      projectedNet: 200,
    })
    expect(dashboard.delinquencyTotals).toEqual({
      count: 2,
      amount: 550,
      low: 0,
      medium: 2,
      high: 0,
    })
    expect(dashboard.cards).toEqual([
      {
        key: 'realized-net',
        title: 'Resultado realizado',
        value: 1000,
        tone: 'success',
      },
      {
        key: 'projected-net',
        title: 'Resultado previsto',
        value: 200,
        tone: 'info',
      },
      {
        key: 'overdue-amount',
        title: 'Valor em atraso',
        value: 550,
        tone: 'danger',
      },
      {
        key: 'overdue-count',
        title: 'Títulos em atraso',
        value: 2,
        tone: 'warning',
      },
    ])
  })

  it('builds the operational dashboard with volume cards and neutral/warning states', async () => {
    prisma.contract.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)

    prisma.financialEntry.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7)

    const dashboard = await generateOperationalDashboard({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(prisma.contract.count).toHaveBeenCalledTimes(3)
    expect(prisma.financialEntry.count).toHaveBeenCalledTimes(2)
    expect(dashboard.cards).toEqual([
      {
        key: 'active-contracts',
        title: 'Contratos ativos',
        value: 5,
        tone: 'success',
      },
      {
        key: 'renewed-contracts',
        title: 'Renovações no período',
        value: 2,
        tone: 'info',
      },
      {
        key: 'locked-contracts',
        title: 'Contratos trancados',
        value: 0,
        tone: 'neutral',
      },
      {
        key: 'open-entries',
        title: 'Lançamentos em aberto',
        value: 3,
        tone: 'warning',
      },
      {
        key: 'paid-entries',
        title: 'Lançamentos pagos',
        value: 7,
        tone: 'success',
      },
    ])
  })
})
