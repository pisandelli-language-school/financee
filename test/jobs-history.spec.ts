import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  jobDefinition: {
    findMany: vi.fn(),
  },
  jobExecution: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
}

vi.mock('~~/server/utils/prisma', () => ({
  prisma,
}))

vi.mock('~~/server/utils/notifications', () => ({
  archiveExpiredNotifications: vi.fn(),
}))

vi.mock('~~/server/utils/notifications-automation', () => ({
  syncNotificationAutomationRules: vi.fn(),
}))

vi.mock('~~/server/utils/financial-calendar', () => ({
  resolveEffectiveDueDate: vi.fn(),
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

const {
  getJobExecutions,
  getLastExecution,
  listJobs,
} = await import('~~/server/utils/jobs')

describe('jobs history and listing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps only the newest execution per key when listing jobs', async () => {
    prisma.jobDefinition.findMany.mockResolvedValue([
      {
        id: 'job_1',
        key: 'check-cashflow',
        title: 'Monitorar fluxo de caixa',
        mode: 'BOTH',
        isEnabled: true,
        disabledAt: null,
        disabledById: null,
        disabledBy: null,
        scheduleLabel: 'Diariamente',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        updatedAt: new Date('2026-08-01T10:00:00.000Z'),
      },
      {
        id: 'job_2',
        key: 'expire-notifications',
        title: 'Arquivar notificações lidas antigas',
        mode: 'AUTOMATIC',
        isEnabled: true,
        disabledAt: null,
        disabledById: null,
        disabledBy: null,
        scheduleLabel: 'Diariamente',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        updatedAt: new Date('2026-08-01T10:00:00.000Z'),
      },
    ])
    prisma.jobExecution.findMany.mockResolvedValue([
      {
        id: 'exec_latest_cashflow',
        jobKey: 'check-cashflow',
        status: 'SUCCESS',
        startedAt: new Date('2026-08-03T09:00:00.000Z'),
        finishedAt: new Date('2026-08-03T09:00:02.000Z'),
        durationMs: 2000,
        errorMessage: null,
        metadata: { createdCount: 2 },
        createdAt: new Date('2026-08-03T09:00:00.000Z'),
      },
      {
        id: 'exec_old_cashflow',
        jobKey: 'check-cashflow',
        status: 'FAILED',
        startedAt: new Date('2026-08-02T09:00:00.000Z'),
        finishedAt: new Date('2026-08-02T09:00:05.000Z'),
        durationMs: 5000,
        errorMessage: 'Falha anterior',
        metadata: null,
        createdAt: new Date('2026-08-02T09:00:00.000Z'),
      },
      {
        id: 'exec_notifications',
        jobKey: 'expire-notifications',
        status: 'SUCCESS',
        startedAt: new Date('2026-08-03T08:00:00.000Z'),
        finishedAt: new Date('2026-08-03T08:00:01.000Z'),
        durationMs: 1000,
        errorMessage: null,
        metadata: { archivedCount: 3 },
        createdAt: new Date('2026-08-03T08:00:00.000Z'),
      },
    ])

    const jobs = await listJobs()

    expect(jobs).toEqual([
      expect.objectContaining({
        key: 'check-cashflow',
        lastExecution: expect.objectContaining({
          id: 'exec_latest_cashflow',
          status: 'SUCCESS',
          metadata: {
            createdCount: 2,
          },
        }),
      }),
      expect.objectContaining({
        key: 'expire-notifications',
        lastExecution: expect.objectContaining({
          id: 'exec_notifications',
          status: 'SUCCESS',
          metadata: {
            archivedCount: 3,
          },
        }),
      }),
    ])
  })

  it('returns execution history ordered descending and respects the requested limit', async () => {
    prisma.jobExecution.findMany.mockResolvedValue([
      {
        id: 'exec_3',
        jobKey: 'check-contracts',
        status: 'SUCCESS',
        startedAt: new Date('2026-08-03T12:00:00.000Z'),
        finishedAt: new Date('2026-08-03T12:00:02.000Z'),
        durationMs: 2000,
        errorMessage: null,
        metadata: { createdCount: 1, emailedCount: 0 },
        createdAt: new Date('2026-08-03T12:00:00.000Z'),
      },
      {
        id: 'exec_2',
        jobKey: 'check-contracts',
        status: 'FAILED',
        startedAt: new Date('2026-08-02T12:00:00.000Z'),
        finishedAt: new Date('2026-08-02T12:00:05.000Z'),
        durationMs: 5000,
        errorMessage: 'Falha',
        metadata: null,
        createdAt: new Date('2026-08-02T12:00:00.000Z'),
      },
    ])

    const history = await getJobExecutions('check-contracts', 20)

    expect(prisma.jobExecution.findMany).toHaveBeenCalledWith({
      where: {
        jobKey: 'check-contracts',
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 20,
    })
    expect(history).toEqual([
      {
        id: 'exec_3',
        jobKey: 'check-contracts',
        status: 'SUCCESS',
        startedAt: '2026-08-03T12:00:00.000Z',
        finishedAt: '2026-08-03T12:00:02.000Z',
        durationMs: 2000,
        errorMessage: null,
        metadata: {
          createdCount: 1,
          emailedCount: 0,
        },
        createdAt: '2026-08-03T12:00:00.000Z',
      },
      {
        id: 'exec_2',
        jobKey: 'check-contracts',
        status: 'FAILED',
        startedAt: '2026-08-02T12:00:00.000Z',
        finishedAt: '2026-08-02T12:00:05.000Z',
        durationMs: 5000,
        errorMessage: 'Falha',
        metadata: null,
        createdAt: '2026-08-02T12:00:00.000Z',
      },
    ])
  })

  it('returns the most recent execution summary or null when there is no history', async () => {
    prisma.jobExecution.findFirst
      .mockResolvedValueOnce({
        id: 'exec_last',
        jobKey: 'extend-recurrence-window',
        status: 'SUCCESS',
        startedAt: new Date('2026-08-03T07:00:00.000Z'),
        finishedAt: new Date('2026-08-03T07:00:03.000Z'),
        durationMs: 3000,
        errorMessage: null,
        metadata: { createdCount: 12 },
        createdAt: new Date('2026-08-03T07:00:00.000Z'),
      })
      .mockResolvedValueOnce(null)

    await expect(getLastExecution('extend-recurrence-window')).resolves.toEqual({
      id: 'exec_last',
      jobKey: 'extend-recurrence-window',
      status: 'SUCCESS',
      startedAt: '2026-08-03T07:00:00.000Z',
      finishedAt: '2026-08-03T07:00:03.000Z',
      durationMs: 3000,
      errorMessage: null,
      metadata: {
        createdCount: 12,
      },
      createdAt: '2026-08-03T07:00:00.000Z',
    })
    await expect(getLastExecution('missing-job')).resolves.toBeNull()
  })
})
