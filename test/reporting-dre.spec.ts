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

const { generateDre, parseReportingFilters } = await import('~~/server/utils/reporting')

describe('dre reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds grouped totals excluding transfers and respecting the selected regime', async () => {
    prisma.financialEntry.findMany.mockResolvedValue([
      {
        direction: 'INCOME',
        amount: 1800,
        category: {
          id: 'cat_income',
          name: 'Mensalidades',
          dreGroup: 'OPERATING_REVENUE',
        },
      },
      {
        direction: 'EXPENSE',
        amount: 500,
        category: {
          id: 'cat_expense',
          name: 'Equipe',
          dreGroup: 'OPERATING_EXPENSE',
        },
      },
      {
        direction: 'EXPENSE',
        amount: 75,
        category: null,
      },
    ])

    const report = await generateDre({
      regime: 'COMPETENCE',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(prisma.financialEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        type: { not: 'TRANSFER' },
        status: { in: ['OPEN', 'PAID'] },
        competenceDate: expect.any(Object),
      }),
    }))
    expect(report.totals).toEqual({
      income: 1800,
      expense: 575,
      net: 1225,
    })
    expect(report.groups).toMatchObject([
      {
        key: 'OPERATING_EXPENSE',
        label: 'Despesa operacional',
        amount: -500,
      },
      {
        key: 'UNCLASSIFIED',
        label: 'Não classificado',
        amount: -75,
      },
      {
        key: 'OPERATING_REVENUE',
        label: 'Receita operacional',
        amount: 1800,
      },
    ])
  })

  it('rejects invalid date ranges while parsing reporting filters', () => {
    const event = {} as Parameters<typeof parseReportingFilters>[0]

    vi.stubGlobal('getQuery', () => ({
      regime: 'CASH',
      dateFrom: '2026-08-01',
      dateTo: '2026-07-01',
    }))

    expect(() => parseReportingFilters(event)).toThrowError('A data inicial deve ser menor ou igual à data final.')
  })
})
