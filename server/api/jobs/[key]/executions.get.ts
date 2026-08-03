import { requirePermission } from '~~/server/utils/auth'
import { parsePageSize } from '~~/server/utils/auth-admin'
import { getJobExecutions } from '~~/server/utils/jobs'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'jobs.view')

  const key = getRouterParam(event, 'key') || ''
  const query = getQuery(event)
  const limit = parsePageSize(query.limit) || 20

  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Job inválido.',
    })
  }

  return await getJobExecutions(key, limit)
})
