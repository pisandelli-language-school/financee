import { requirePermission } from '~~/server/utils/auth'
import { markAllNotificationsAsRead } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'notificacoes.view')

  return {
    updatedCount: await markAllNotificationsAsRead(user.id),
  }
})
