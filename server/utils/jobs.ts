import { Prisma } from '@prisma/client'
import type { JobExecution, JobExecutionStatus, RecurrenceFrequency } from '@prisma/client'
import { createAuditLog } from '~~/server/utils/audit'
import { sendInternalNotificationEmail } from '~~/server/utils/email'
import { archiveExpiredNotifications } from '~~/server/utils/notifications'
import { syncNotificationAutomationRules } from '~~/server/utils/notifications-automation'
import { resolveEffectiveDueDate } from '~~/server/utils/financial-calendar'
import { prisma } from '~~/server/utils/prisma'

type JobExecutionRecord = JobExecution
type JobDefinitionRecord = Prisma.JobDefinitionGetPayload<{
  include: {
    disabledBy: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

interface JobExecutorResult {
  status?: Exclude<JobExecutionStatus, 'PENDING' | 'RUNNING'>
  errorMessage?: string | null
  metadata?: Record<string, unknown> | null
}

interface JobCatalogEntry {
  key: string
  run: () => Promise<JobExecutorResult>
}

const DEFAULT_JOB_EXECUTIONS_LIMIT = 20
const RECURRENCE_WINDOW_MONTHS = 12

function serializeJobDefinition(record: JobDefinitionRecord, lastExecution?: JobExecutionRecord | null) {
  return {
    id: record.id,
    key: record.key,
    title: record.title,
    mode: record.mode,
    isEnabled: record.isEnabled,
    disabledAt: record.disabledAt?.toISOString() ?? null,
    disabledById: record.disabledById ?? null,
    disabledByName: record.disabledBy?.name ?? null,
    scheduleLabel: record.scheduleLabel,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastExecution: lastExecution ? serializeJobExecution(lastExecution) : null,
  }
}

function serializeJobExecution(record: JobExecutionRecord) {
  return {
    id: record.id,
    jobKey: record.jobKey,
    status: record.status,
    startedAt: record.startedAt.toISOString(),
    finishedAt: record.finishedAt?.toISOString() ?? null,
    durationMs: record.durationMs ?? null,
    errorMessage: record.errorMessage ?? null,
    metadata: toRecord(record.metadata),
    createdAt: record.createdAt.toISOString(),
  }
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function addMonths(date: Date, monthOffset: number) {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + monthOffset)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addRecurrenceOffset(date: Date, frequency: RecurrenceFrequency, index: number) {
  if (index === 0) {
    return date
  }

  switch (frequency) {
    case 'WEEKLY':
      return addDays(date, index * 7)
    case 'BIWEEKLY':
      return addDays(date, index * 14)
    case 'QUARTERLY':
      return addMonths(date, index * 3)
    case 'SEMIANNUAL':
      return addMonths(date, index * 6)
    case 'ANNUAL':
      return addMonths(date, index * 12)
    case 'MONTHLY':
    default:
      return addMonths(date, index)
  }
}

function getJobCatalog(): JobCatalogEntry[] {
  return [
    {
      key: 'check-contracts',
      run: async () => {
        const result = await syncNotificationAutomationRules([
          'contract-ending-soon',
          'contract-without-payment-condition',
        ])

        return {
          status: 'SUCCESS',
          metadata: {
            createdCount: result.createdCount,
            emailedCount: result.emailedCount,
            rules: ['contract-ending-soon', 'contract-without-payment-condition'],
          },
        }
      },
    },
    {
      key: 'check-overdue-entries',
      run: async () => {
        const result = await syncNotificationAutomationRules([
          'overdue-entry',
          'entry-due-soon',
        ])

        return {
          status: 'SUCCESS',
          metadata: {
            createdCount: result.createdCount,
            emailedCount: result.emailedCount,
            rules: ['overdue-entry', 'entry-due-soon'],
          },
        }
      },
    },
    {
      key: 'check-cashflow',
      run: async () => {
        const result = await syncNotificationAutomationRules([
          'negative-cash-flow',
        ])

        return {
          status: 'SUCCESS',
          metadata: {
            createdCount: result.createdCount,
            emailedCount: result.emailedCount,
            rules: ['negative-cash-flow'],
          },
        }
      },
    },
    {
      key: 'check-contracts-without-entries',
      run: async () => {
        const result = await syncNotificationAutomationRules([
          'contract-without-generated-entries',
        ])

        return {
          status: 'SUCCESS',
          metadata: {
            createdCount: result.createdCount,
            emailedCount: result.emailedCount,
            rules: ['contract-without-generated-entries'],
          },
        }
      },
    },
    {
      key: 'extend-recurrence-window',
      run: extendRecurrenceWindowJob,
    },
    {
      key: 'expire-notifications',
      run: async () => {
        const archivedCount = await archiveExpiredNotifications()

        return {
          status: 'SUCCESS',
          metadata: {
            archivedCount,
          },
        }
      },
    },
    {
      key: 'purge-integration-payloads',
      run: async () => {
        return {
          status: 'SUCCESS',
          metadata: {
            purgedCount: 0,
            skippedReason: 'IntegrationLog ainda não existe no MVP atual.',
          },
        }
      },
    },
  ]
}

function getJobRunner(jobKey: string) {
  return getJobCatalog().find(job => job.key === jobKey)?.run ?? null
}

async function extendRecurrenceWindowJob(): Promise<JobExecutorResult> {
  const horizon = addMonths(new Date(), RECURRENCE_WINDOW_MONTHS)
  const occurrences = await prisma.financialEntry.findMany({
    where: {
      deletedAt: null,
      recurrenceType: 'FIXED',
      recurrenceFrequency: {
        not: null,
      },
      recurrenceGroupId: {
        not: null,
      },
      recurrenceTotal: null,
    },
    include: {
      tags: {
        select: {
          tagId: true,
        },
      },
    },
    orderBy: [
      { recurrenceGroupId: 'asc' },
      { recurrenceIndex: 'desc' },
    ],
  })

  const latestByGroup = new Map<string, typeof occurrences[number]>()

  for (const occurrence of occurrences) {
    if (!occurrence.recurrenceGroupId || latestByGroup.has(occurrence.recurrenceGroupId)) {
      continue
    }

    latestByGroup.set(occurrence.recurrenceGroupId, occurrence)
  }

  let groupsScanned = 0
  let groupsExtended = 0
  let createdCount = 0

  for (const latest of latestByGroup.values()) {
    if (!latest.recurrenceGroupId || !latest.recurrenceFrequency || !latest.recurrenceIndex) {
      continue
    }

    groupsScanned += 1

    let cursorCompetenceDate = latest.competenceDate
    let cursorScheduledDueDate = latest.scheduledDueDate
    let nextIndex = latest.recurrenceIndex + 1
    let createdForGroup = 0

    while (true) {
      const nextCompetenceDate = addRecurrenceOffset(cursorCompetenceDate, latest.recurrenceFrequency, 1)
      const nextScheduledDueDate = addRecurrenceOffset(cursorScheduledDueDate, latest.recurrenceFrequency, 1)

      if (nextScheduledDueDate > horizon) {
        break
      }

      const existing = await prisma.financialEntry.findFirst({
        where: {
          recurrenceGroupId: latest.recurrenceGroupId,
          recurrenceIndex: nextIndex,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      })

      if (!existing) {
        const effectiveDueDate = await resolveEffectiveDueDate(nextScheduledDueDate)

        await prisma.financialEntry.create({
          data: {
            direction: latest.direction,
            type: latest.type,
            status: 'OPEN',
            description: latest.description,
            amount: latest.amount,
            competenceDate: nextCompetenceDate,
            scheduledDueDate: nextScheduledDueDate,
            effectiveDueDate,
            paymentDate: null,
            paymentAccountId: null,
            paymentMethodId: latest.paymentMethodId,
            contactId: latest.contactId,
            accountId: latest.accountId,
            categoryId: latest.categoryId,
            subcategoryId: latest.subcategoryId,
            costCenterId: latest.costCenterId,
            contractId: latest.contractId,
            recurrenceType: latest.recurrenceType,
            recurrenceFrequency: latest.recurrenceFrequency,
            recurrenceGroupId: latest.recurrenceGroupId,
            recurrenceIndex: nextIndex,
            recurrenceTotal: null,
            transferGroupId: null,
            notes: latest.notes,
            tags: {
              create: latest.tags.map(tag => ({
                tagId: tag.tagId,
              })),
            },
          },
        })

        createdForGroup += 1
        createdCount += 1
      }

      cursorCompetenceDate = nextCompetenceDate
      cursorScheduledDueDate = nextScheduledDueDate
      nextIndex += 1
    }

    if (createdForGroup > 0) {
      groupsExtended += 1
    }
  }

  return {
    status: 'SUCCESS',
    metadata: {
      groupsScanned,
      groupsExtended,
      createdCount,
      horizonMonths: RECURRENCE_WINDOW_MONTHS,
    },
  }
}

function canRunAutomatically(mode: JobDefinitionRecord['mode']) {
  return mode === 'AUTOMATIC' || mode === 'BOTH'
}

function canRunManually(mode: JobDefinitionRecord['mode']) {
  return mode === 'MANUAL' || mode === 'BOTH'
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Falha inesperada durante a execução do job.'
}

async function resolveFailureRecipients() {
  return await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      internalRole: {
        name: {
          in: ['Admin', 'Gestor'],
        },
        permissions: {
          some: {
            permission: {
              key: 'notificacoes.view',
            },
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })
}

async function registerJobFailureAlerts(
  definition: JobDefinitionRecord,
  execution: ReturnType<typeof serializeJobExecution>,
  errorMessage: string,
) {
  await createAuditLog({
    severity: 'CRITICAL',
    eventType: 'job.execution.failed',
    entityType: 'JobDefinition',
    entityId: definition.id,
    entityLabel: definition.title,
    action: 'JOB_FAILED',
    metadata: {
      jobKey: definition.key,
      executionId: execution.id,
      status: execution.status,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      durationMs: execution.durationMs,
      errorMessage,
    },
  })

  const recipients = await resolveFailureRecipients()

  for (const recipient of recipients) {
    const dedupeKey = `job-failure:${definition.key}:${execution.id}:${recipient.id}`

    const existing = await prisma.notification.findUnique({
      where: {
        userId_dedupeKey: {
          userId: recipient.id,
          dedupeKey,
        },
      },
      select: {
        id: true,
      },
    })

    if (existing) {
      continue
    }

    await prisma.notification.create({
      data: {
        userId: recipient.id,
        title: `Falha no job: ${definition.title}`,
        message: `O job "${definition.title}" falhou e exige atenção operacional. Erro: ${errorMessage}`,
        severity: 'CRITICAL',
        isPriority: true,
        type: 'job-failed',
        actionUrl: '/configuracoes/jobs',
        entityType: 'JobDefinition',
        entityId: definition.id,
        dedupeKey,
        metadata: {
          jobKey: definition.key,
          executionId: execution.id,
          status: execution.status,
        } as Prisma.InputJsonValue,
      },
    })

    await sendInternalNotificationEmail({
      to: recipient.email,
      title: `Falha no job: ${definition.title}`,
      message: `O job "${definition.title}" falhou e exige atenção operacional.\n\nErro: ${errorMessage}`,
      ctaLabel: 'Abrir Jobs',
      ctaUrl: '/configuracoes/jobs',
    })
  }
}

export async function listJobs() {
  const [definitions, executions] = await Promise.all([
    prisma.jobDefinition.findMany({
      include: {
        disabledBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    }),
    prisma.jobExecution.findMany({
      orderBy: {
        startedAt: 'desc',
      },
    }),
  ])

  const lastExecutionByKey = new Map<string, JobExecutionRecord>()

  for (const execution of executions) {
    if (!lastExecutionByKey.has(execution.jobKey)) {
      lastExecutionByKey.set(execution.jobKey, execution)
    }
  }

  return definitions.map(definition =>
    serializeJobDefinition(definition, lastExecutionByKey.get(definition.key) ?? null),
  )
}

export async function toggleJob(jobKey: string, isEnabled: boolean, actorId?: string | null) {
  const record = await prisma.jobDefinition.update({
    include: {
      disabledBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: {
      key: jobKey,
    },
    data: {
      isEnabled,
      disabledAt: isEnabled ? null : new Date(),
      disabledById: isEnabled ? null : (actorId ?? null),
    },
  })

  return serializeJobDefinition(record)
}

export async function getJobExecutions(jobKey: string, limit = DEFAULT_JOB_EXECUTIONS_LIMIT) {
  const items = await prisma.jobExecution.findMany({
    where: {
      jobKey,
    },
    orderBy: {
      startedAt: 'desc',
    },
    take: limit,
  })

  return items.map(serializeJobExecution)
}

export async function getLastExecution(jobKey: string) {
  const record = await prisma.jobExecution.findFirst({
    where: {
      jobKey,
    },
    orderBy: {
      startedAt: 'desc',
    },
  })

  return record ? serializeJobExecution(record) : null
}

export async function runJobNow(jobKey: string) {
  const definition = await prisma.jobDefinition.findUnique({
    where: {
      key: jobKey,
    },
  })

  if (!definition) {
    throw createError({
      statusCode: 404,
      message: 'Job não encontrado.',
    })
  }

  if (!canRunManually(definition.mode)) {
    throw createError({
      statusCode: 400,
      message: 'Este job não permite execução manual.',
    })
  }

  return await executeJobDefinition(definition)
}

export async function runAutomaticJob(jobKey: string) {
  const definition = await prisma.jobDefinition.findUnique({
    where: {
      key: jobKey,
    },
  })

  if (!definition) {
    throw createError({
      statusCode: 404,
      message: 'Job não encontrado.',
    })
  }

  if (!definition.isEnabled) {
    return {
      skipped: true,
      reason: 'disabled',
      job: serializeJobDefinition(definition),
    }
  }

  if (!canRunAutomatically(definition.mode)) {
    return {
      skipped: true,
      reason: 'manual-only',
      job: serializeJobDefinition(definition),
    }
  }

  return await executeJobDefinition(definition)
}

async function executeJobDefinition(definition: JobDefinitionRecord) {
  const run = getJobRunner(definition.key)

  if (!run) {
    throw createError({
      statusCode: 400,
      message: 'Job sem executor configurado.',
    })
  }

  const startedAt = new Date()
  const execution = await prisma.jobExecution.create({
    data: {
      jobKey: definition.key,
      status: 'RUNNING',
      startedAt,
      metadata: Prisma.JsonNull,
    },
  })

  try {
    const result = await run()
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()

    const updated = await prisma.jobExecution.update({
      where: {
        id: execution.id,
      },
      data: {
        status: result.status ?? 'SUCCESS',
        finishedAt,
        durationMs,
        errorMessage: result.errorMessage ?? null,
        metadata: result.metadata == null
          ? Prisma.JsonNull
          : result.metadata as Prisma.InputJsonValue,
      },
    })

    return serializeJobExecution(updated)
  }
  catch (error) {
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()
    const errorMessage = normalizeErrorMessage(error)

    const updated = await prisma.jobExecution.update({
      where: {
        id: execution.id,
      },
      data: {
        status: 'FAILED',
        finishedAt,
        durationMs,
        errorMessage,
      },
    })

    await registerJobFailureAlerts(definition, serializeJobExecution(updated), errorMessage)

    throw createError({
      statusCode: 500,
      message: errorMessage,
      data: {
        execution: serializeJobExecution(updated),
      },
    })
  }
}
