import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  jobDefinition: {
    findUnique: vi.fn(),
  },
  jobExecution: {
    create: vi.fn(),
    update: vi.fn(),
  },
  financialEntry: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock('~~/server/utils/prisma', () => ({
  prisma,
}))

vi.mock('~~/server/utils/financial-calendar', () => ({
  resolveEffectiveDueDate: vi.fn(async (date: Date) => date),
}))

vi.mock('~~/server/utils/notifications', () => ({
  archiveExpiredNotifications: vi.fn(),
}))

vi.mock('~~/server/utils/notifications-automation', () => ({
  syncNotificationAutomationRules: vi.fn(),
}))

vi.mock('~~/server/utils/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('~~/server/utils/email', () => ({
  sendInternalNotificationEmail: vi.fn(),
}))

vi.stubGlobal('createError', (input: { message?: string, statusCode?: number, data?: unknown }) => {
  const error = new Error(input.message ?? 'Erro')

  Object.assign(error, {
    statusCode: input.statusCode,
    data: input.data,
  })

  return error
})

const { runAutomaticJob } = await import('~~/server/utils/jobs')

describe('jobs recurrence extension', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('extends fixed monthly recurrences up to the rolling 12-month horizon', async () => {
    prisma.jobDefinition.findUnique.mockResolvedValue({
      id: 'job-extend-1',
      key: 'extend-recurrence-window',
      title: 'Estender janela de recorrencias',
      mode: 'BOTH',
      isEnabled: true,
      scheduleLabel: 'Diariamente',
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
      updatedAt: new Date('2026-08-03T12:00:00.000Z'),
    })

    prisma.jobExecution.create.mockResolvedValue({
      id: 'exec-extend-1',
      jobKey: 'extend-recurrence-window',
      status: 'RUNNING',
      startedAt: new Date('2026-08-03T12:00:00.000Z'),
      finishedAt: null,
      durationMs: null,
      errorMessage: null,
      metadata: null,
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
    })

    prisma.financialEntry.findMany.mockResolvedValue([
      {
        id: 'entry-fixed-1',
        direction: 'INCOME',
        type: 'STANDARD',
        description: 'Mensalidade recorrente',
        amount: 350,
        competenceDate: new Date('2026-08-01T00:00:00.000Z'),
        scheduledDueDate: new Date('2026-08-01T00:00:00.000Z'),
        paymentMethodId: 'payment_1',
        contactId: 'contact_1',
        accountId: 'account_1',
        categoryId: 'category_1',
        subcategoryId: null,
        costCenterId: 'cost_1',
        contractId: null,
        recurrenceType: 'FIXED',
        recurrenceFrequency: 'MONTHLY',
        recurrenceGroupId: 'group-fixed-1',
        recurrenceIndex: 1,
        recurrenceTotal: null,
        notes: 'Clonar ate o horizonte',
        deletedAt: null,
        tags: [
          { tagId: 'tag_urgent' },
          { tagId: 'tag_school' },
        ],
      },
    ])

    prisma.financialEntry.findFirst.mockResolvedValue(null)
    prisma.financialEntry.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `entry-created-${String(data.recurrenceIndex)}`,
      ...data,
    }))

    prisma.jobExecution.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'exec-extend-1',
      jobKey: 'extend-recurrence-window',
      status: String(data.status ?? 'SUCCESS'),
      startedAt: new Date('2026-08-03T12:00:00.000Z'),
      finishedAt: new Date('2026-08-03T12:00:01.000Z'),
      durationMs: 1000,
      errorMessage: data.errorMessage ?? null,
      metadata: data.metadata ?? null,
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
    }))

    const execution = await runAutomaticJob('extend-recurrence-window')

    expect(prisma.financialEntry.create).toHaveBeenCalledTimes(12)
    expect(prisma.financialEntry.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        recurrenceGroupId: 'group-fixed-1',
        recurrenceIndex: 2,
        recurrenceType: 'FIXED',
        recurrenceFrequency: 'MONTHLY',
        competenceDate: new Date('2026-09-01T00:00:00.000Z'),
        scheduledDueDate: new Date('2026-09-01T00:00:00.000Z'),
        effectiveDueDate: new Date('2026-09-01T00:00:00.000Z'),
        status: 'OPEN',
        transferGroupId: null,
        tags: {
          create: [
            { tagId: 'tag_urgent' },
            { tagId: 'tag_school' },
          ],
        },
      }),
    }))
    expect(prisma.financialEntry.create).toHaveBeenNthCalledWith(12, expect.objectContaining({
      data: expect.objectContaining({
        recurrenceIndex: 13,
        competenceDate: new Date('2027-08-01T00:00:00.000Z'),
        scheduledDueDate: new Date('2027-08-01T00:00:00.000Z'),
      }),
    }))

    expect(execution).toMatchObject({
      jobKey: 'extend-recurrence-window',
      status: 'SUCCESS',
      metadata: {
        groupsScanned: 1,
        groupsExtended: 1,
        createdCount: 12,
        horizonMonths: 12,
      },
    })
  })
})
