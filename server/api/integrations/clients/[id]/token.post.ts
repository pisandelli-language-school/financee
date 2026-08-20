import { requirePermission } from '~~/server/utils/auth'
import { issueIntegrationClientToken } from '~~/server/utils/integration-admin'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'integracoes.manage')
  const body = await readBody<{ expiresInDays?: number }>(event)
  return await issueIntegrationClientToken(getRouterParam(event, 'id') || '', body?.expiresInDays)
})
