import { Prisma } from '@prisma/client'
import type { AuditSeverity, User } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

interface AuditActor {
  id: string
  email: string
}

interface CreateAuditLogInput {
  severity?: AuditSeverity
  eventType: string
  entityType: string
  entityId: string
  entityLabel?: string | null
  action: string
  actor?: AuditActor | Pick<User, 'id' | 'email'> | null
  before?: unknown
  after?: unknown
  metadata?: unknown
}

export async function createAuditLog(input: CreateAuditLogInput) {
  const toJsonValue = (value: unknown) => {
    if (value == null) {
      return Prisma.JsonNull
    }

    return value as Prisma.InputJsonValue
  }

  await prisma.auditLog.create({
    data: {
      severity: input.severity ?? 'INFO',
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel ?? null,
      action: input.action,
      userId: input.actor?.id ?? null,
      userEmail: input.actor?.email ?? null,
      before: toJsonValue(input.before),
      after: toJsonValue(input.after),
      metadata: toJsonValue(input.metadata),
    },
  })
}
