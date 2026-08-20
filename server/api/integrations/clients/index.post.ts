import { requirePermission } from '~~/server/utils/auth'
import { createIntegrationClient } from '~~/server/utils/integration-admin'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'integracoes.manage')
  return await createIntegrationClient(await readBody(event))
})
