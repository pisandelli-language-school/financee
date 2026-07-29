import { requirePermission } from '~~/server/utils/auth'
import { updateAutomationRule } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'automacoes.manage')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    severity?: 'INFO' | 'WARNING' | 'CRITICAL'
    config?: Record<string, unknown> | null
  }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID da automação é obrigatório.',
    })
  }

  if (!body.severity || !['INFO', 'WARNING', 'CRITICAL'].includes(body.severity)) {
    throw createError({
      statusCode: 400,
      message: 'Severidade inválida.',
    })
  }

  return await updateAutomationRule(id, {
    severity: body.severity,
    config: body.config ?? null,
  })
})
