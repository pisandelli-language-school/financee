import { requirePermission } from '~~/server/utils/auth'
import { getLastExecution } from '~~/server/utils/jobs'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'jobs.view')

  const key = getRouterParam(event, 'key') || ''

  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Job inválido.',
    })
  }

  return await getLastExecution(key)
})
