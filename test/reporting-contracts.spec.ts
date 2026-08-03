import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  contract: {
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

const { generateContractsReport } = await import('~~/server/utils/reporting')

describe('contracts reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes contract rows and aggregates totals by status', async () => {
    prisma.contract.findMany.mockResolvedValue([
      {
        id: 'contract_1',
        title: 'Contrato VIP',
        status: 'ACTIVE',
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        expectedEndDate: new Date('2026-12-31T00:00:00.000Z'),
        finalAmount: 1200,
        client: { name: 'Pedro Pisandelli' },
        renewalOf: null,
        renewedBy: [{ id: 'contract_2' }],
        entries: [{ id: 'entry_1' }, { id: 'entry_2' }],
      },
      {
        id: 'contract_2',
        title: 'Contrato Renovado',
        status: 'RENEWED',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        expectedEndDate: new Date('2026-06-30T00:00:00.000Z'),
        finalAmount: 980,
        client: { name: 'Hatus Rodrigues' },
        renewalOf: { title: 'Contrato VIP' },
        renewedBy: [],
        entries: [{ id: 'entry_3' }],
      },
      {
        id: 'contract_3',
        title: 'Contrato Trancado',
        status: 'LOCKED',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        expectedEndDate: null,
        finalAmount: 500,
        client: { name: 'Jéssika Basílio' },
        renewalOf: null,
        renewedBy: [],
        entries: [],
      },
    ])

    const report = await generateContractsReport({
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    })

    expect(report.items).toEqual([
      {
        id: 'contract_1',
        title: 'Contrato VIP',
        clientName: 'Pedro Pisandelli',
        status: 'ACTIVE',
        startDate: '2026-07-01',
        expectedEndDate: '2026-12-31',
        finalAmount: 1200,
        entriesCount: 2,
        renewedByCount: 1,
        renewalOfTitle: null,
      },
      {
        id: 'contract_2',
        title: 'Contrato Renovado',
        clientName: 'Hatus Rodrigues',
        status: 'RENEWED',
        startDate: '2026-01-01',
        expectedEndDate: '2026-06-30',
        finalAmount: 980,
        entriesCount: 1,
        renewedByCount: 0,
        renewalOfTitle: 'Contrato VIP',
      },
      {
        id: 'contract_3',
        title: 'Contrato Trancado',
        clientName: 'Jéssika Basílio',
        status: 'LOCKED',
        startDate: '2026-05-01',
        expectedEndDate: null,
        finalAmount: 500,
        entriesCount: 0,
        renewedByCount: 0,
        renewalOfTitle: null,
      },
    ])

    expect(report.totals).toEqual({
      total: 3,
      active: 1,
      renewed: 1,
      locked: 1,
      canceled: 0,
      closed: 0,
      proposals: 0,
      drafts: 0,
    })
  })
})
