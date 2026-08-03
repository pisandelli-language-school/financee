import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  jobDefinition: {
    findUnique: vi.fn(),
  },
  jobExecution: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  notification: {
    findUnique: vi.fn(),
    create: vi.fn(),
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

const { runAutomaticJob, runJobNow } = await import('~~/server/utils/jobs')
const { syncNotificationAutomationRules } = await import('~~/server/utils/notifications-automation')
const { createAuditLog } = await import('~~/server/utils/audit')
const { sendInternalNotificationEmail } = await import('~~/server/utils/email')

describe('jobs runtime guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips automatic execution when the job is disabled', async () => {
    prisma.jobDefinition.findUnique.mockResolvedValue({
      id: 'job-1',
      key: 'check-contracts',
      title: 'Verificar contratos',
      mode: 'BOTH',
      isEnabled: false,
      scheduleLabel: 'Diariamente',
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
      updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    })

    await expect(runAutomaticJob('check-contracts')).resolves.toMatchObject({
      skipped: true,
      reason: 'disabled',
      job: {
        key: 'check-contracts',
        isEnabled: false,
      },
    })
  })

  it('skips automatic execution for manual-only jobs', async () => {
    prisma.jobDefinition.findUnique.mockResolvedValue({
      id: 'job-2',
      key: 'expire-notifications',
      title: 'Expirar notificações',
      mode: 'MANUAL',
      isEnabled: true,
      scheduleLabel: null,
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
      updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    })

    await expect(runAutomaticJob('expire-notifications')).resolves.toMatchObject({
      skipped: true,
      reason: 'manual-only',
      job: {
        key: 'expire-notifications',
        mode: 'MANUAL',
      },
    })
  })

  it('rejects manual execution for automatic-only jobs', async () => {
    prisma.jobDefinition.findUnique.mockResolvedValue({
      id: 'job-3',
      key: 'check-cashflow',
      title: 'Verificar caixa',
      mode: 'AUTOMATIC',
      isEnabled: true,
      scheduleLabel: 'Diariamente',
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
      updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    })

    await expect(runJobNow('check-cashflow')).rejects.toMatchObject({
      message: 'Este job não permite execução manual.',
      statusCode: 400,
    })
  })

  it('stores success metadata when a manual execution completes normally', async () => {
    prisma.jobDefinition.findUnique.mockResolvedValue({
      id: 'job-5',
      key: 'check-contracts-without-entries',
      title: 'Contratos sem lançamentos',
      mode: 'BOTH',
      isEnabled: true,
      scheduleLabel: 'Diariamente',
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
      updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    })
    prisma.jobExecution.create.mockResolvedValue({
      id: 'exec-5',
      jobKey: 'check-contracts-without-entries',
      status: 'RUNNING',
      startedAt: new Date('2026-08-03T10:00:00.000Z'),
      finishedAt: null,
      durationMs: null,
      errorMessage: null,
      metadata: null,
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
    })
    prisma.jobExecution.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'exec-5',
      jobKey: 'check-contracts-without-entries',
      status: data.status,
      startedAt: new Date('2026-08-03T10:00:00.000Z'),
      finishedAt: new Date('2026-08-03T10:00:02.000Z'),
      durationMs: 2000,
      errorMessage: null,
      metadata: data.metadata,
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
    }))
    vi.mocked(syncNotificationAutomationRules).mockResolvedValue({
      createdCount: 4,
      emailedCount: 1,
    })

    const execution = await runJobNow('check-contracts-without-entries')

    expect(syncNotificationAutomationRules).toHaveBeenCalledWith([
      'contract-without-generated-entries',
    ])
    expect(prisma.jobExecution.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'SUCCESS',
        metadata: {
          createdCount: 4,
          emailedCount: 1,
          rules: ['contract-without-generated-entries'],
        },
      }),
    }))
    expect(execution).toMatchObject({
      status: 'SUCCESS',
      metadata: {
        createdCount: 4,
        emailedCount: 1,
        rules: ['contract-without-generated-entries'],
      },
    })
  })

  it('registers failure alerts when a manual job execution crashes', async () => {
    prisma.jobDefinition.findUnique.mockResolvedValue({
      id: 'job-4',
      key: 'check-contracts',
      title: 'Verificar contratos',
      mode: 'BOTH',
      isEnabled: true,
      scheduleLabel: 'Diariamente',
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
      updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    })
    prisma.jobExecution.create.mockResolvedValue({
      id: 'exec-1',
      jobKey: 'check-contracts',
      status: 'RUNNING',
      startedAt: new Date('2026-08-03T10:00:00.000Z'),
      finishedAt: null,
      durationMs: null,
      errorMessage: null,
      metadata: null,
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
    })
    prisma.jobExecution.update.mockResolvedValue({
      id: 'exec-1',
      jobKey: 'check-contracts',
      status: 'FAILED',
      startedAt: new Date('2026-08-03T10:00:00.000Z'),
      finishedAt: new Date('2026-08-03T10:00:05.000Z'),
      durationMs: 5000,
      errorMessage: 'Falha SMTP',
      metadata: null,
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
    })
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'admin@financee.test',
        name: 'Admin',
      },
    ])
    prisma.notification.findUnique.mockResolvedValue(null)
    prisma.notification.create.mockResolvedValue({
      id: 'notification-1',
    })
    vi.mocked(syncNotificationAutomationRules).mockRejectedValue(new Error('Falha SMTP'))
    vi.mocked(sendInternalNotificationEmail).mockResolvedValue({
      delivered: true,
    })

    await expect(runJobNow('check-contracts')).rejects.toMatchObject({
      statusCode: 500,
      message: 'Falha SMTP',
    })

    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'CRITICAL',
      eventType: 'job.execution.failed',
      entityType: 'JobDefinition',
      entityId: 'job-4',
      entityLabel: 'Verificar contratos',
    }))
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1',
        title: 'Falha no job: Verificar contratos',
        severity: 'CRITICAL',
        actionUrl: '/configuracoes/jobs',
        entityType: 'JobDefinition',
        entityId: 'job-4',
      }),
    }))
    expect(sendInternalNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'admin@financee.test',
      title: 'Falha no job: Verificar contratos',
      ctaUrl: '/configuracoes/jobs',
    }))
  })
})
