import { requirePermission } from '~~/server/utils/auth'
import { deleteNotification } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'notificacoes.view')
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID da notificação é obrigatório.',
    })
  }

  await deleteNotification(user.id, id)

  return {
    success: true,
  }
})
