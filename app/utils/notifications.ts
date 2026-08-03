import type { NotificationRecord } from '~/types/notifications'

export function getNotificationContextLabel(notification: Pick<NotificationRecord, 'metadata'>) {
  const metadata = notification.metadata ?? {}

  if (typeof metadata.contractTitle === 'string' && typeof metadata.clientName === 'string') {
    return `${metadata.contractTitle} · ${metadata.clientName}`
  }

  if (typeof metadata.description === 'string' && typeof metadata.contactName === 'string' && metadata.contactName.length > 0) {
    return `${metadata.description} · ${metadata.contactName}`
  }

  if (typeof metadata.description === 'string') {
    return metadata.description
  }

  if (typeof metadata.month === 'string') {
    return `Período ${metadata.month}`
  }

  return null
}
