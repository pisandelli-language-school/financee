import { requirePermission } from '~~/server/utils/auth'
import { updateIntegrationClient } from '~~/server/utils/integration-admin'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'integracoes.manage')
  return await updateIntegrationClient(getRouterParam(event, 'id') || '', await readBody(event))
})
