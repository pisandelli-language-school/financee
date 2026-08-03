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

const { generateDelinquencyReport } = await import('~~/server/utils/reporting')

describe('delinquency reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes overdue entries and aggregates totals by temperature', async () => {
    prisma.financialEntry.findMany.mockResolvedValue([
      {
        id: 'entry_1',
        description: 'Parcela 1',
        amount: 200,
        scheduledDueDate: new Date('2026-07-01T00:00:00.000Z'),
        effectiveDueDate: new Date('2026-07-08T00:00:00.000Z'),
        contact: { name: 'Pedro Pisandelli' },
        account: { name: 'Conta Escola' },
      },
      {
        id: 'entry_2',
        description: 'Parcela 2',
        amount: 350,
        scheduledDueDate: new Date('2026-07-05T00:00:00.000Z'),
        effectiveDueDate: new Date('2026-07-20T00:00:00.000Z'),
        contact: null,
        account: { name: 'Conta Escola' },
      },
      {
        id: 'entry_3',
        description: 'Parcela 3',
        amount: 500,
        scheduledDueDate: new Date('2026-06-10T00:00:00.000Z'),
        effectiveDueDate: new Date('2026-06-15T00:00:00.000Z'),
        contact: { name: 'Hatus Rodrigues' },
        account: { name: 'Conta Escola' },
      },
    ])

    const report = await generateDelinquencyReport({
      dateFrom: '2026-06-01',
      dateTo: '2026-07-31',
      referenceDate: '2026-07-31',
    })

    expect(report.items).toEqual([
      {
        id: 'entry_1',
        description: 'Parcela 1',
        amount: 200,
        contactName: 'Pedro Pisandelli',
        accountName: 'Conta Escola',
        effectiveDueDate: '2026-07-08',
        scheduledDueDate: '2026-07-01',
        overdueDays: 23,
        temperature: 'MEDIUM',
      },
      {
        id: 'entry_2',
        description: 'Parcela 2',
        amount: 350,
        contactName: null,
        accountName: 'Conta Escola',
        effectiveDueDate: '2026-07-20',
        scheduledDueDate: '2026-07-05',
        overdueDays: 11,
        temperature: 'MEDIUM',
      },
      {
        id: 'entry_3',
        description: 'Parcela 3',
        amount: 500,
        contactName: 'Hatus Rodrigues',
        accountName: 'Conta Escola',
        effectiveDueDate: '2026-06-15',
        scheduledDueDate: '2026-06-10',
        overdueDays: 46,
        temperature: 'HIGH',
      },
    ])

    expect(report.totals).toEqual({
      count: 3,
      amount: 1050,
      low: 0,
      medium: 2,
      high: 1,
    })
  })
})
