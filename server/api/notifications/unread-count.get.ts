import { requirePermission } from '~~/server/utils/auth'
import { archiveExpiredNotifications, countUnreadNotifications } from '~~/server/utils/notifications'
import { syncNotificationAutomations } from '~~/server/utils/notifications-automation'

export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'notificacoes.view')
  await archiveExpiredNotifications()
  await syncNotificationAutomations()

  return {
    unreadCount: await countUnreadNotifications(user.id),
  }
})
