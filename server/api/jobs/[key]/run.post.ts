import { requirePermission } from '~~/server/utils/auth'
import { createAuditLog } from '~~/server/utils/audit'
import { listJobs, runJobNow } from '~~/server/utils/jobs'

export default defineEventHandler(async (event) => {
  const { user: actor } = await requirePermission(event, 'jobs.run')
  const key = getRouterParam(event, 'key') || ''

  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Job inválido.',
    })
  }

  const job = (await listJobs()).find(item => item.key === key) ?? null

  if (!job) {
    throw createError({
      statusCode: 404,
      message: 'Job não encontrado.',
    })
  }

  const execution = await runJobNow(key)

  await createAuditLog({
    eventType: 'JOB_EXECUTED_MANUALLY',
    entityType: 'JobDefinition',
    entityId: job.id,
    entityLabel: job.title,
    action: 'run.manual',
    actor,
    metadata: {
      jobKey: job.key,
      execution,
    },
  })

  return execution
})
