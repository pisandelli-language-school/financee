import { requirePermission } from '~~/server/utils/auth'
import { archiveExpiredNotifications, listNotifications, parseNotificationsFilters } from '~~/server/utils/notifications'
import { syncNotificationAutomations } from '~~/server/utils/notifications-automation'

export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'notificacoes.view')
  const filters = parseNotificationsFilters(getQuery(event))

  await archiveExpiredNotifications()
  await syncNotificationAutomations()

  return await listNotifications(user.id, filters)
})
