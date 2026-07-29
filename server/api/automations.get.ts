import { requirePermission } from '~~/server/utils/auth'
import { listAutomationRules } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'automacoes.manage')
  return await listAutomationRules()
})
