import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  contract: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  financialEntry: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  account: {
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

const {
  generateFinancialDashboard,
  generateOperationalDashboard,
} = await import('~~/server/utils/reporting')

describe('reporting dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('combines cash flow and delinquency into the financial dashboard cards', async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: 'account_1',
        name: 'Conta Escola',
        type: 'Conta corrente',
        initialValue: 100,
        institution: { name: 'PagBank', logoKey: 'pagbank' },
      },
    ])
    prisma.financialEntry.findMany.mockImplementation((args) => {
      if (args.where.paymentDate?.lte && !args.where.paymentDate?.gte) {
        return Promise.resolve([
          { accountId: 'account_1', paymentAccountId: 'account_1', direction: 'INCOME', amount: 1200 },
          { accountId: 'account_1', paymentAccountId: 'account_1', direction: 'EXPENSE', amount: 200 },
        ])
      }

      if ('id' in args.select) {
        return Promise.resolve([
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
      }

      if (args.where.status === 'PAID') {
        return Promise.resolve([
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
      }

      return Promise.resolve([
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
    })

    const dashboard = await generateFinancialDashboard({
      regime: 'CASH',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(prisma.financialEntry.findMany).toHaveBeenCalledTimes(4)
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
    expect(dashboard.cashFlowHistory).toHaveLength(1)
    expect(dashboard.cashFlowHistory.map(bucket => bucket.periodKey)).toEqual([
      '2026-07',
    ])
    expect(dashboard.accountBalances).toEqual([
      {
        id: 'account_1',
        name: 'Conta Escola',
        type: 'Conta corrente',
        institutionName: 'PagBank',
        institutionLogoKey: 'pagbank',
        balance: 1100,
      },
    ])
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

  it('attributes dashboard amounts to the selected cash or competence date', async () => {
    prisma.account.findMany.mockResolvedValue([])
    prisma.financialEntry.findMany.mockImplementation((args) => {
      if (args.where.paymentDate?.lte && !args.where.paymentDate?.gte) {
        return Promise.resolve([])
      }

      if ('id' in args.select) {
        return Promise.resolve([])
      }

      if (args.where.status === 'PAID') {
        return Promise.resolve(args.where.paymentDate
          ? []
          : [{ direction: 'INCOME', amount: 100, competenceDate: new Date('2026-08-01T00:00:00.000Z'), effectiveDueDate: new Date('2026-09-01T00:00:00.000Z'), paymentDate: new Date('2026-09-01T00:00:00.000Z') }])
      }

      return Promise.resolve(args.where.effectiveDueDate
        ? []
        : [{ direction: 'EXPENSE', amount: 30, competenceDate: new Date('2026-08-01T00:00:00.000Z'), effectiveDueDate: new Date('2026-09-01T00:00:00.000Z'), paymentDate: null }])
    })

    const cash = await generateFinancialDashboard({
      regime: 'CASH',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })
    const competence = await generateFinancialDashboard({
      regime: 'COMPETENCE',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })

    expect(cash.cashFlowTotals).toMatchObject({
      realizedIncome: 0,
      projectedExpense: 0,
    })
    expect(competence.cashFlowTotals).toMatchObject({
      realizedIncome: 100,
      projectedExpense: 30,
    })
  })

  it('builds the operational dashboard with volume cards and neutral/warning states', async () => {
    prisma.contract.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)

    prisma.financialEntry.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7)

    prisma.contract.findMany.mockResolvedValueOnce([
      {
        status: 'ACTIVE',
        startDate: new Date('2026-03-01T00:00:00.000Z'),
        expectedEndDate: null,
      },
      {
        status: 'RENEWED',
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        expectedEndDate: new Date('2026-08-31T00:00:00.000Z'),
      },
    ])
    prisma.financialEntry.findMany.mockResolvedValueOnce([
      {
        status: 'OPEN',
        effectiveDueDate: new Date('2026-06-10T00:00:00.000Z'),
        paymentDate: null,
      },
      {
        status: 'OPEN',
        effectiveDueDate: new Date('2026-07-12T00:00:00.000Z'),
        paymentDate: null,
      },
      {
        status: 'PAID',
        effectiveDueDate: new Date('2026-05-08T00:00:00.000Z'),
        paymentDate: new Date('2026-05-09T00:00:00.000Z'),
      },
      {
        status: 'PAID',
        effectiveDueDate: new Date('2026-07-15T00:00:00.000Z'),
        paymentDate: new Date('2026-07-18T00:00:00.000Z'),
      },
    ])

    const dashboard = await generateOperationalDashboard({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(prisma.contract.count).toHaveBeenCalledTimes(3)
    expect(prisma.financialEntry.count).toHaveBeenCalledTimes(2)
    expect(prisma.contract.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.financialEntry.findMany).toHaveBeenCalledTimes(1)
    expect(dashboard.history).toEqual([
      { periodKey: '2026-02', label: 'Fevereiro de 2026', activeContracts: 0, renewedContracts: 0, openEntries: 0, paidEntries: 0 },
      { periodKey: '2026-03', label: 'Março de 2026', activeContracts: 1, renewedContracts: 0, openEntries: 0, paidEntries: 0 },
      { periodKey: '2026-04', label: 'Abril de 2026', activeContracts: 1, renewedContracts: 0, openEntries: 0, paidEntries: 0 },
      { periodKey: '2026-05', label: 'Maio de 2026', activeContracts: 1, renewedContracts: 0, openEntries: 0, paidEntries: 1 },
      { periodKey: '2026-06', label: 'Junho de 2026', activeContracts: 2, renewedContracts: 1, openEntries: 1, paidEntries: 0 },
      { periodKey: '2026-07', label: 'Julho de 2026', activeContracts: 2, renewedContracts: 0, openEntries: 1, paidEntries: 1 },
    ])
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
