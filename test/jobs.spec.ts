import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  jobDefinition: {
    findUnique: vi.fn(),
  },
  jobExecution: {
    create: vi.fn(),
    update: vi.fn(),
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
})
