import { requirePermission } from '~~/server/utils/auth'
import { toggleAutomationRule } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'automacoes.manage')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ isEnabled?: boolean }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID da automação é obrigatório.',
    })
  }

  if (typeof body.isEnabled !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Valor de ativação inválido.',
    })
  }

  return await toggleAutomationRule(id, body.isEnabled)
})
