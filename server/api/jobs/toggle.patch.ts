import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { listJobs, toggleJob } from '~~/server/utils/jobs'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'jobs.run')
  const body = await readBody<{ key?: string, isEnabled?: boolean }>(event)
  const key = typeof body?.key === 'string' ? body.key : ''

  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Job inválido.',
    })
  }

  if (typeof body?.isEnabled !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Estado do job inválido.',
    })
  }

  const before = (await listJobs()).find(item => item.key === key) ?? null

  if (!before) {
    throw createError({
      statusCode: 404,
      message: 'Job não encontrado.',
    })
  }

  const updated = await toggleJob(key, body.isEnabled, actor.id)

  await createAuditLog({
    eventType: 'JOB_TOGGLED',
    entityType: 'JobDefinition',
    entityId: updated.id,
    entityLabel: updated.title,
    action: body.isEnabled ? 'enable' : 'disable',
    actor,
    before: {
      isEnabled: before.isEnabled,
      disabledAt: before.disabledAt,
      disabledById: before.disabledById,
    },
    after: {
      isEnabled: updated.isEnabled,
      disabledAt: updated.disabledAt,
      disabledById: updated.disabledById,
    },
    metadata: {
      jobKey: updated.key,
      mode: updated.mode,
    },
  })

  return updated
})
